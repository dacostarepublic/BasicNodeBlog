import { injectable, inject } from "inversify";

import { IArticleService, IArticleTree } from "../../../../Common/Services/Article/IArticleService"
import { IMetaHeader } from "../../../../Common/Domain/IMetaHeader"
import { ExtractMetaHeader } from "./ExtractMetaHeader"
import { IArticle } from "../../../../Common/Domain/IArticle"
import { IConfig, IConfigKey } from "../../../../_Parent/Server/Config/IConfig"
import { ILogger, ILoggerKey } from "../../../../_Parent/Common/Services/Logging/ILogger"
import { Article } from "./Article"

import * as dirtree from "directory-tree"
import * as md5File from "md5-file/promise"
import * as rel from "relative"
import { Stats } from "fs"
import * as FS from "fs"
import * as PATH from "path"
import * as UPATH from "upath"

class ArticleTree implements IArticleTree {
    name: string;
    article: IArticle;
    children: IArticleTree[];
}

@injectable()
export class ArticleService implements IArticleService { 
    articleWithSource: IArticle;  
    articleTree: IArticleTree;
    tagCloud: Map<string, number>;
    articleIndex: Map<string, IArticle> = new Map<string,IArticle>();

    constructor(
        @inject(IConfigKey) private config: IConfig,
        @inject(ILoggerKey) private logger: ILogger) { }

    public async getArticleWithSource(id: string): Promise<IArticle> {
        let articleIndex = await this.getArticleIndex()
        let article = articleIndex.get(id);
        let articleLocalPath = PATH.join(this.config.contentLocalPath, article.path);
        let content = FS.readFileSync(articleLocalPath, "utf8").toString();
        article.source = content;
        return article;
    }

    private async getArticleIndex(): Promise<Map<string, IArticle>> {
        this.articleIndex.clear();
        let articleTree = await this.GetArticleTree();
        let articleCallback = (article:IArticle)=>{
            this.articleIndex.set(article.metaHeader.id, article);
        }
        this.walkArticleTreeRecursive(articleTree, articleCallback);
        return Promise.resolve(this.articleIndex);
    }

    private walkArticleTreeRecursive(articleTree:IArticleTree, articleCallback:(IArticle)=>void){
        if(articleTree.article != null){
            articleCallback(articleTree.article);
        }else if(articleTree.children != null){
            articleTree.children.forEach((tree)=>{this.walkArticleTreeRecursive(tree, articleCallback)});
        }else{
            throw new Error("article and children null");
        }
    }

    public async GetArticleTree(): Promise<IArticleTree> {
        if(!FS.existsSync(this.config.contentLocalPath)){
            throw new Error("content directory does not exists");
        }

        const cachedTreePath = PATH.join(this.config.contentLocalPath, "cached.json");
        // use precached tree if exist
        if (FS.existsSync(cachedTreePath)) {
            return new Promise<IArticleTree>((resolve, reject) => {
                FS.readFile(cachedTreePath, 'utf8', (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        try {
                            const tree: IArticleTree = JSON.parse(data);
                            resolve(tree);
                        } catch (errJson) {
                            try {
                                FS.unlinkSync(cachedTreePath); //best attempt
                            } catch (_) { }
                            reject(errJson);
                        }
                    }
                });
            });
        }
        // generate tree and save to cache file
        const tree = await this.getArticleTreeRecursive(this.config.contentLocalPath, this.config.contentLocalPath, null)
        const json = JSON.stringify(tree);
        return new Promise<IArticleTree>((resolve, reject) => {
            FS.writeFile(cachedTreePath, json, 'utf8', err => {
                if (err) {
                    reject(err);
                } else {
                    resolve(tree);
                }
            });
        });
    }

    private async getArticleTreeRecursive(basePath: string, path: string, parent: ArticleTree): Promise<ArticleTree> {
        let stats: Stats;

        try {
            stats = FS.statSync(path);
        }
        catch (e) { return; }

        if (stats.isFile()) {
            if (parent == null) {
                // shouldn't get here
                throw new Error("article doesn't have a parent directory");
            }
            const ext = PATH.extname(path).toLowerCase();
            let rootDirName = PATH.basename(basePath);
            let pathParent = PATH.basename(PATH.dirname(path));        
            if (ext != ".md" || pathParent == rootDirName || path.includes(".git")) {
                return;
            }
            let article = new Article();
            article.metaHeader = await this.readMetaHeader(path);
            article.path = rel.toBase(UPATH.normalize(basePath), UPATH.normalize(path));
            article.hash = await md5File(path);
            article.title = article.metaHeader.title ? article.metaHeader.title : parent.name; 
            parent.article = article;
            parent.name = null; // redundant, container for the article with title
            parent.children = null;
        } else if (stats.isDirectory()) {
            if (path.includes(".git")) {
                return;
            }            
            const item = new ArticleTree();
            item.name = PATH.basename(path);
            item.article = null;
            item.children = [];
            if (parent != null) {
                parent.children.push(item);
            }
            const children = this.readDirSync(path);
            await Promise.all(children.map(async child => await this.getArticleTreeRecursive(basePath, PATH.join(path, child), item)));
            return item;
        }
        return null;
    }

    private readMetaHeader(articlePath: string): Promise<IMetaHeader> {
        return new Promise((resolve, reject) => {
            FS.readFile(articlePath, "utf8", (err, data) => {
                if (err) {
                    reject(err);
                }
                try {
                    let metaHeader = ExtractMetaHeader.Extract(data);
                    resolve(metaHeader);
                } catch (extractError) {
                    reject(extractError);
                }
            });
        });
    }

    private readDirSync(path: string): string[] {
        let dirData: string[] = [];
        try {
            dirData = FS.readdirSync(path);
        } catch (ex) {
            if (ex.code == "EACCES")
                //User does not have permissions, ignore directory
                return null;
            else throw ex;
        }
        return dirData;
    }
}
import * as React from "react";

import { IPriorityRouteProps } from "../../../Client/Lib/Route/IPriorityRouteProps";

export interface IContentRouteProps extends IPriorityRouteProps {}
export let IContentRoutePropsKey = "IContentRouteKey";

export interface IContent extends React.Component<any, any> {}
export let IContentKey = "IContent";
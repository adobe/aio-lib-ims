import { getTokenData } from "./ims";
import { Ims } from "./ims";
import ValidationCache = require("./ValidationCache");
import { ACCESS_TOKEN } from "./ims";
import { REFRESH_TOKEN } from "./ims";
import { AUTHORIZATION_CODE } from "./ims";
import { CLIENT_ID } from "./ims";
import { CLIENT_SECRET } from "./ims";
import { SCOPE } from "./ims";
import { ConfigCliContext } from "./ctx/ConfigCliContext";
import { StateActionContext } from "./ctx/StateActionContext";
export declare let context: ConfigCliContext | StateActionContext;
export declare function getToken(contextName: string, options: object): Promise<string>;
export declare function invalidateToken(contextName: string, force?: boolean): Promise<any>;
export { getTokenData, Ims, ValidationCache, ACCESS_TOKEN, REFRESH_TOKEN, AUTHORIZATION_CODE, CLIENT_ID, CLIENT_SECRET, SCOPE };

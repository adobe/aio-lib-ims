/** @private */
export function resetContext(): void;
/** @private */
export function getContext(): any;
/** Name of context type action */
export const TYPE_ACTION: "action";
/** Name of context type cli */
export const TYPE_CLI: "cli";
/** Name of the IMS configuration context data structure */
export const IMS: "ims";
/** Property holding the current context name */
export const CURRENT: "current";
/** Property holding the cli context name */
export const CLI: "cli";
/** Property holding an object with all contexts */
export const CONTEXTS: "contexts";
/** Property holding an object with context management configuration */
export const CONFIG: "config";

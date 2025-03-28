/**
 * Represnts a Discord event
 */
export default class Event {
    once: boolean
    execute: (...args: any) => Promise<void> | void

    /**
     * @param {{
     *      once: boolean,
     *      execute: (...args: any) => Promise<void> | void
     *  }} object
     */
    constructor(object: {
        once?: boolean
        execute: (...args: any) => Promise<void> | void
    }) {
        this.once = object.once ?? false
        this.execute = object.execute
    }
}
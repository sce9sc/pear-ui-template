
import pearRun from 'pear-run'
import EventEmitter from 'events'
import RPC from 'bare-rpc'
import FramedStream from 'framed-stream'
import { API, API_BY_VALUE } from '../services/oniri-core/src/index.js';

function getWorkletPath() {
    const fromDisk = Pear.app.key === null

    const WORKLET_PATH_DEV =
        './node_modules/oniri-core/src/app.js'
    const WORKLET_PATH_PROD =
        Pear.config.applink +
        '/services/oniri-core/src/app.js'

    const WORKLET_PATH = fromDisk ? WORKLET_PATH_DEV : WORKLET_PATH_PROD

    return { WORKLET_PATH, WORKLET_PATH_DEV, WORKLET_PATH_PROD }
}



export class RpcClient extends EventEmitter {
    constructor(debugMode = false) {
        super()
        this.ipc = null
        this.rpc = null


        this.debugMode = debugMode

        this._logger = {
            log: (...args) => {
                if (!this.debugMode) {
                    return
                }

                console.log(...args)
            },
            error: (...args) => {
                console.error(...args)
            }
        }

        this.init()
    }

    handleIncomingMessage(req) {
        switch (req.command) {
            case API.EVENTNOTIFICATION:
                const parsedData = JSON.parse(req.data)
                this._logger.log('Received event notification:', parsedData)
                this.emit('event', parsedData)
                break
            default:
                this._logger.log('Received unknown incoming message:', req)
        }
    }

    async _handleRequest({ command, data }) {
        const commandName = API_BY_VALUE[command]

        if (!commandName) {
            throw new Error('Unknown command:', command)
        }

        this._logger.log('Sending request:', commandName, data ?? '')

        const req = this.rpc.request(command)

        req.send(data ? JSON.stringify(data) : undefined)

        const res = await req.reply('utf8')

        const parsedRes = JSON.parse(res)

        this._handleError(parsedRes)

        this._logger.log('Received response:', API_BY_VALUE[req.command], parsedRes)

        return parsedRes?.data
    }

    _handleError(parsedRes) {
        const error = parsedRes?.error

        if (error?.includes('ELOCKED')) {
            throw new Error('ELOCKED')
        }

        if (error) {
            throw new Error(error)
        }
    }

    async init() {
        try {

            this.ipc = pearRun(getWorkletPath().WORKLET_PATH)
            testUpdate.innerText = 'IPC started'
            this.rpc = new RPC(new FramedStream(this.ipc), (req) => {
                this.handleIncomingMessage(req)
            })

        } catch (error) {
            console.error('Error setting up IPC:', error)
        }
    }

    async sendTestCommand(data) {
        return this._handleRequest({ command: API.TESTCOMMAND, data })
    }
}




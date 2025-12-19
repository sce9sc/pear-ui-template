
import RPC from 'bare-rpc'
import FramedStream from 'framed-stream'

let rpc


export const setupIPC = () => {
  const ipc = Pear.worker.pipe() 

  ipc.on('close', async () => {
    
    // eslint-disable-next-line no-undef
    Bare.exit(0)
  })

  ipc.on('end', async () => {
   
    // eslint-disable-next-line no-undef
    Bare.exit(0)
  })

  return ipc
}

const handleRpcCommand = (req) => {
    console.log('This was send to me',req)
}

export const createRPC = (ipc) => {
  rpc = new RPC(new FramedStream(ipc), (req) => {
    try {
      return handleRpcCommand(req)
    } catch (error) {
      req.reply(
        JSON.stringify({
          error: `Unexpected error: ${error}`
        })
      )
    }
  })
  return rpc
}

;(async () => {
  try {
    console.log(typeof Pear !== 'undefined')
    console.log('testing service app.js started')
    const ipc = setupIPC()
    rpc = createRPC(ipc)

    
  } catch (error) {
    console.error('Fatal error in app initialization:', error)
  }
})()




export {rpc}


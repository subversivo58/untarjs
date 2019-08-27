/**
 * @license The MIT License (MIT) {@link https://github.com/subversivo58/untarjs/blob/master/LICENSE LICENSE}
 * @copyright Copyright (c) 2015 Sebastian Jørgensen | Copyright (c) 2019 Lauro Moraes
 * @see https://github.com/InvokIT/js-untar
 */
export default (arrayBuffer, workerScriptUri = false) => {
    return new Promise((resolve, reject) => {
        if ( !(arrayBuffer instanceof ArrayBuffer) ) {
            reject('"arrayBuffer" param is not an instance of `ArrayBuffer`')
            return
        }
        if ( !(workerScriptUri) ) {
            reject('"workerScriptUri" param is not defined')
            return
        }
        let worker = new Worker(workerScriptUri),
            files = []
        worker.onerror = (err) => {
            reject(err)
        }
        worker.onmessage = (message) => {
            message = message.data
            switch (message.type) {
                case "extract":
                    files.push(message.data)
                    break;
                case "complete":
                    worker.terminate()
                    resolve(files)
                    break;
                case "error":
                    worker.terminate()
                    reject(message.data.message)
                    break;
                default:
                    worker.terminate()
                    reject("Unknown message from worker: " + message.type)
                    break;
            }
        }
        worker.postMessage({ type: "extract", buffer: arrayBuffer }, [arrayBuffer])
    })
}

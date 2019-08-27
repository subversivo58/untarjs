/**
 * @license The MIT License (MIT) {@link https://github.com/subversivo58/untarjs/blob/master/LICENSE LICENSE}
 * @copyright Copyright (c) 2015 Sebastian Jørgensen | Copyright (c) 2019 Lauro Moraes
 * @see https://github.com/InvokIT/js-untar
 */
"use strict";
function decodeUTF8(bytes) {
    return new TextEncoder().encode(bytes)
}

function UntarWorker() {
    return {
        onmessage(msg) {
            try {
                if ( msg.data.type === "extract" ) {
                    this.untarBuffer(msg.data.buffer)
                } else {
                    throw new Error("Unknown message type: " + msg.data.type)
                }
            } catch(err) {
                this.postError(err)
            }
        },
        postError(err) {
            this.postMessage({type: "error", data: { message: err.message }})
        },
        untarBuffer(arrayBuffer) {
            try {
                var tarFileStream = new UntarFileStream(arrayBuffer)
                while (tarFileStream.hasNext()) {
                    let file = tarFileStream.next()
                    this.postMessage({type: "extract", data: file}, [file.buffer])
                }
                this.postMessage({type: "complete"})
            } catch(err) {
                this.postError(err)
            }
        },
        postMessage(msg, transfers) {
            self.postMessage(msg, transfers)
        }
    }
}

function PaxHeader(fields) {
    let self = this
    this._fields = fields
    return {
        applyHeader(file) {
            /**
             * Apply fields to the file
             * If a field is of value null, it should be deleted from the file
             * https://www.mkssoftware.com/docs/man4/pax.4.asp
             */
            self._fields.forEach(field => {
                let fieldName = field.name,
                    fieldValue = field.value
                if ( fieldName === "path" ) {
                    // This overrides the name and prefix fields in the following header block.
                    fieldName = "name"

                    if ( file.prefix !== undefined ) {
                        delete file.prefix
                    }
                } else if ( fieldName === "linkpath" ) {
                    // This overrides the linkname field in the following header block.
                    fieldName = "linkname"
                }
                if ( fieldValue === null ) {
                    delete file[fieldName]
                } else {
                    file[fieldName] = fieldValue
                }
            })
        },
        parse(buffer) {
            /**
             * https://www.ibm.com/support/knowledgecenter/en/SSLTBW_2.3.0/com.ibm.zos.v2r3.bpxa500/paxex.htm
             * An extended header shall consist of one or more records, each constructed as follows:
             * "%d %s=%s\n", <length>, <keyword>, <value>
             * The extended header records shall be encoded according to the ISO/IEC10646-1:2000 standard (UTF-8).
             * The <length> field, <blank>, equals sign, and <newline> shown shall be limited to the portable character set, as
             * encoded in UTF-8. The <keyword> and <value> fields can be any UTF-8 characters. The <length> field shall be the
             * decimal length of the extended header record in octets, including the trailing <newline>.
             */
            let bytes = new Uint8Array(buffer),
                fields = []
            while (bytes.length > 0) {
                // Decode bytes up to the first space character; that is the total field length
                let fieldLength = parseInt(decodeUTF8(bytes.subarray(0, bytes.indexOf(0x20)))),
                    fieldText = decodeUTF8(bytes.subarray(0, fieldLength)),
                    fieldMatch = fieldText.match(/^\d+ ([^=]+)=(.*)\n$/)
                if ( fieldMatch === null ) {
                    throw new Error("Invalid PAX header data format.")
                }
                let fieldName = fieldMatch[1],
                    fieldValue = fieldMatch[2]
                if ( fieldValue.length === 0 ) {
                    fieldValue = null
                } else if ( fieldValue.match(/^\d+$/) !== null ) {
                    // If it's a integer field, parse it as int
                    fieldValue = parseInt(fieldValue)
                }
                // Don't parse float values since precision is lost
                let field = {
                    name: fieldName,
                    value: fieldValue
                }
                fields.push(field)
                bytes = bytes.subarray(fieldLength) // Cut off the parsed field data
            }
            return new PaxHeader(fields)
        }
    }
}

// noop
function TarFile() {}

function UntarStream(arrayBuffer) {
    let self = this
    this._bufferView = new DataView(arrayBuffer)
    this._position = 0
    return {
        readString(charCount) {
            let charSize = 1,
                byteCount = charCount * charSize,
                charCodes = []
            for (let i = 0; i < charCount; ++i) {
                let charCode = self._bufferView.getUint8(this.position() + (i * charSize), true)
                if ( charCode !== 0 ) {
                    charCodes.push(charCode)
                } else {
                    break
                }
            }
            this.seek(byteCount)
            return String.fromCharCode.apply(null, charCodes)
        },
        readBuffer(byteCount) {
            let buf;
            if ( typeof ArrayBuffer.prototype.slice === "function" ) {
                buf = self._bufferView.buffer.slice(this.position(), this.position() + byteCount)
            } else {
                buf = new ArrayBuffer(byteCount)
                let target = new Uint8Array(buf),
                    src = new Uint8Array(self._bufferView.buffer, this.position(), byteCount)
                target.set(src)
            }
            this.seek(byteCount)
            return buf
        },
        seek(byteCount) {
            self._position += byteCount
        },
        peekUint32() {
            return self._bufferView.getUint32(this.position(), true)
        },
        position(newpos) {
            if ( newpos === undefined ) {
                return self._position
            } else {
                self._position = newpos
            }
        },
        size() {
            return self._bufferView.byteLength
        }
    }
}

function UntarFileStream(arrayBuffer) {
    let self = this
    this._stream = new UntarStream(arrayBuffer)
    this._globalPaxHeader = null
    return {
        hasNext() {
            // A tar file ends with 4 zero bytes
            return self._stream.position() + 4 < self._stream.size() && self._stream.peekUint32() !== 0
        },
        next() {
            return this._readNextFile()
        },
        _readNextFile() {
            let stream = self._stream,
                file = new TarFile(),
                isHeaderFile = false,
                paxHeader = null,

                headerBeginPos = stream.position(),
                dataBeginPos = headerBeginPos + 512;
            // Read header
            file.name = stream.readString(100)
            file.mode = stream.readString(8)
            file.uid = parseInt(stream.readString(8))
            file.gid = parseInt(stream.readString(8))
            file.size = parseInt(stream.readString(12), 8)
            file.mtime = parseInt(stream.readString(12), 8)
            file.checksum = parseInt(stream.readString(8))
            file.type = stream.readString(1)
            file.linkname = stream.readString(100)
            file.ustarFormat = stream.readString(6)
            if ( file.ustarFormat.indexOf("ustar") > -1 ) {
                file.version = stream.readString(2)
                file.uname = stream.readString(32)
                file.gname = stream.readString(32)
                file.devmajor = parseInt(stream.readString(8))
                file.devminor = parseInt(stream.readString(8))
                file.namePrefix = stream.readString(155)

                if ( file.namePrefix.length > 0 ) {
                    file.name = file.namePrefix + "/" + file.name
                }
            }
            stream.position(dataBeginPos)
            /**
             * Derived from https://www.mkssoftware.com/docs/man4/pax.4.asp
             * and https://www.ibm.com/support/knowledgecenter/en/SSLTBW_2.3.0/com.ibm.zos.v2r3.bpxa500/pxarchfm.htm
             */
            switch (file.type) {
                case "0": // Normal file is either "0" or "\0".
                case "":  // In case of "\0", readString returns an empty string, that is "".
                    file.buffer = stream.readBuffer(file.size)
                    break;
                case "1": // Link to another file already archived - TODO Should we do anything with these?
                case "2": // Symbolic link - TODO Should we do anything with these?
                case "3": // Character special device (what does this mean??)
                case "4": // Block special device
                case "5": // Directory
                case "6": // FIFO special file
                case "7": // Reserved
                    break;
                case "g": // Global PAX header
                    isHeaderFile = true
                    self._globalPaxHeader = PaxHeader.parse(stream.readBuffer(file.size))
                    break;
                case "x": // PAX header
                    isHeaderFile = true
                    paxHeader = PaxHeader.parse(stream.readBuffer(file.size))
                    break;
                default:  // Unknown file type
                    break;
            }
            if ( file.buffer === undefined ) {
                file.buffer = new ArrayBuffer(0)
            }
            let dataEndPos = dataBeginPos + file.size
            // File data is padded to reach a 512 byte boundary; skip the padded bytes too.
            if ( file.size % 512 !== 0 ) {
                dataEndPos += 512 - (file.size % 512)
            }
            stream.position(dataEndPos)
            if ( isHeaderFile ) {
                file = this._readNextFile()
            }
            if ( self._globalPaxHeader !== null ) {
                self._globalPaxHeader.applyHeader(file)
            }
            if ( paxHeader !== null ) {
                paxHeader.applyHeader(file)
            }
            return file
        }
    }
}

// initialize
let worker = new UntarWorker()
// handler incoming messages
self.onmessage = (message) => {
    worker.onmessage(message)
}

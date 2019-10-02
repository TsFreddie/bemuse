import Promise from 'bluebird'
import co from 'co'
import fs from 'fs'
import Throat from 'throat'
import { cpus } from 'os'
import endpoint from 'endpoint'
import { spawn } from 'child_process'
import { extname, basename } from 'path'

let throat = new Throat(cpus().length || 1)

export class AudioConvertor {
  constructor(type, ...extra) {
    this._target = type
    this._extra = extra
  }
  convert(file) {
    let ext = extname(file.name).toLowerCase()
    if (ext === '.' + this._target && !this.force) {
      return Promise.resolve(file)
    } else {
      let name = basename(file.name, ext) + '.' + this._target
      return this._doConvert(file.path, this._target).then(buffer =>
        file.derive(name, buffer)
      )
    }
  }
  _doConvert(path, type) {
    return this._SoX(path, type)
  }
  // TODO [$5d94c82086dc190007494e7b]: Convert the `_SoX` method to async function (instead of using `co`) in [bemuse-tools] src/audio.js
  // See issue #575 for more details.
  _SoX(path, type) {
    return co(
      function*() {
        let typeArgs = []
        try {
          let fd = yield Promise.promisify(fs.open, fs)(path, 'r')
          let buffer = Buffer.alloc(4)
          let read = yield Promise.promisify(fs.read, fs)(
            fd,
            buffer,
            0,
            4,
            null
          )
          yield Promise.promisify(fs.close, fs)(fd)
          if (read === 0) {
            console.error('[WARN] Empty keysound file.')
          } else if (
            buffer[0] === 0x49 &&
            buffer[1] === 0x44 &&
            buffer[2] === 0x33
          ) {
            typeArgs = ['-t', 'mp3']
          } else if (buffer[0] === 0xff && buffer[1] === 0xfb) {
            typeArgs = ['-t', 'mp3']
          } else if (
            buffer[0] === 0x4f &&
            buffer[1] === 0x67 &&
            buffer[2] === 0x67 &&
            buffer[3] === 0x53
          ) {
            typeArgs = ['-t', 'ogg']
          }
        } catch (e) {
          console.error('[WARN] Unable to detect file type!')
        }
        return yield this._doSoX(path, type, typeArgs)
      }.bind(this)
    )
  }
  _doSoX(path, type, inputTypeArgs) {
    return throat(
      () =>
        new Promise((resolve, reject) => {
          let sox = spawn('sox', [
            ...inputTypeArgs,
            path,
            '-t',
            type,
            ...this._extra,
            '-',
          ])
          sox.stdin.end()
          sox.stderr.on('data', x => process.stderr.write(x))
          let data = new Promise((resolve, reject) => {
            sox.stdout.pipe(
              endpoint((err, buffer) => {
                if (err) {
                  console.error('Error reading audio!')
                  reject(err)
                } else {
                  resolve(buffer)
                }
              })
            )
          })
          sox.on('close', code => {
            if (code === 0) {
              resolve(data)
            } else {
              console.error(
                'Unable to convert audio file -- SoX exited ' + code
              )
              reject(new Error('SoX process exited: ' + code))
            }
          })
        })
    )
  }
}

export default AudioConvertor

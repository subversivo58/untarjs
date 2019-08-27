[![](https://data.jsdelivr.com/v1/package/gh/subversivo58/untarjs/badge?style=rounded)](https://www.jsdelivr.com/package/gh/subversivo58/untarjs)

## UntarJS

Library for reading tar files in the browser

-----

### Summary:

This library is a free [InvokIT/js-untar](https://github.com/InvokIT/js-untar) adaptation designed on ES6 syntax.

To use this requires additional library for inflating deflate binary blobs. The [pako inflate](https://github.com/nodeca/pako/blob/master/dist/pako_inflate.min.js) library is recommended, but you can use any similar library.

-----

### Brief history:

I needed to unzip in the browser some `.tgz` (tarball) files from modules published to [registry.npmjs.org](https://registry.npmjs.org) in order to extract the raw from their files.

Unfortunately popular libraries were not very helpful in solving my "specific" problem.

[JSZip](https://github.com/Stuk/jszip) didn't seem to solve it, [pako](https://github.com/nodeca/pako) alone didn't help me much, so I found [js-untar](https://github.com/InvokIT/js-untar) and the story changed 😀

-----

### Feature:

Tiny source ... untarjs-with-worker.min.js contains 4.1Kb (1.8Kb gzipped)

-----

### Use:

**Call pako in your document**

```html
<body>
  <script src="path/to/pako_inflate.min.js"></script>
  <script src="path/to/your/script.js" type="module"></script>
</body>
```

**In your script module**
```javascript
// pako not suport ES6 module yet ... pako stay in `window` object
let pako = window.pako

/**
 * import untarjs (basic - expect `Worker` url param) or use `Worker` with `Blob` version
 * 'path/to/untarjs-with-worker.min.mjs'
 */
import untarjs from 'path/to/untarjs.min.mjs'

// request your `.tgz` file (get `ArrayBuffer`)
fetch('path/to/file.tgz').then(response => response.arrayBuffer()).then(async buffer => {

    // inflate
    const inflator = await pako.inflate(buffer)
    
    // get `Array` object(s) file(s) (wit `Worker` url param)
    let result = await untarjs(inflator.buffer, 'path/to/untar.worker.min.js')
    
    // show result (`Array`)
    console.log(result) // output: > [{...}]
    
}).catch(console.error)
```

This library returns a `Promise()`, in the example above was used `async/await` syntax to save writing.

A "conventional" example would be like this:

```javascript
fetch('path/to/file.tgz').then(response => response.arrayBuffer()).then(buffer => {

    // inflate
    const inflator = pako.inflate(buffer)
    
    // get `Array` object(s) file(s) (wit `Worker` url param)
    untarjs(inflator.buffer, 'path/to/untar.worker.min.js').then(result => {
    
        // show result (`Array`)
        console.log(result) // output: > [{...}]
        
    }).catch(console.error)
    
}).catch(console.error)
```

The result is an object (`Array`) containing a collection, you can iterate over them to get your raw data (`ArrayBuffer`) and use it however you like.


Given the following structure of a `.tgz` file (hypothetic):

```none
package/
    package.json
    README.md
    lib/
        index.js
```

The expected result would be (output on `console.log`):

```console
(3) [
    0: {
        buffer: ArrayBuffer(1936) {}
        checksum: 11547
        devmajor: 0
        devminor: 0
        gid: NaN
        gname: ""
        linkname: ""
        mode: "000644 "
        mtime: 499162500
        name: "package/package.json"
        namePrefix: ""
        size: 1936
        type: "0"
        uid: NaN
        uname: ""
        ustarFormat: "ustar"
        version: "00"
    }
    1: {
        buffer: ArrayBuffer(19335) {}
        checksum: 10553
        devmajor: 0
        devminor: 0
        gid: NaN
        gname: ""
        linkname: ""
        mode: "000644 "
        mtime: 499162500
        name: "package/README.md"
        namePrefix: ""
        size: 19335
        type: "0"
        uid: NaN
        uname: ""
        ustarFormat: "ustar"
        version: "00"
    }
    2: {
        buffer: ArrayBuffer(41328) {}
        checksum: 11477
        devmajor: 0
        devminor: 0
        gid: NaN
        gname: ""
        linkname: ""
        mode: "000644 "
        mtime: 499162500
        name: "package/lib/index.js"
        namePrefix: ""
        size: 41328
        type: "0"
        uid: NaN
        uname: ""
        ustarFormat: "ustar"
        version: "00"
    }
    length: 3
    __proto__: Array(0)
]
```

Where perhaps (matter of opinion) the relevant data of each object is:

* **buffer**: the raw data of file (`ArrayBuffer`)
* **name**: the full pathname of file (`String`)
* **size**: the file size in bytes (`Number`)

With this information we already have enough to do something 🤔

-----


### Use cases:

With this raw data it would be possible to create blobs (`Blob`) to store in cache (`Cache`) them in response to requests (if using a `ServiceWorker`), store them in `IndexedDB` or whatever else you can imagine.

Enjoy

-----

### Notes:

> Adapted pako_inflate.js 1.0.10 to ES6 module: [pako_inflate.min.mjs](https://gist.github.com/subversivo58/59433c016b06f17f20545fb8cc7f88b3)

Methods `.blob()`, `.getBlob()`, `.readAsString()` and `.readAsJSON()` from the original library ([js-untar](https://github.com/InvokIT/js-untar)) were removed in this adaptation.

You must implement your own logic to manipulate the file buffer for desired output.

-----

### Contributing:

Any contribution to improving this code is welcome 🎊

-----

### License:

```license
MIT License

Copyright (c) 2015 Sebastian Jørgensen

Copyright (c) 2019 Lauro Moraes https://github.com/subversivo58

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

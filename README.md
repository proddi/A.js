# A.js

  An minimalistic javascript animation framework


## About

  `A.js` is a minimal js framework to animate elements where css animations are not available or not good enough. It is
  **not an replacement** for css animations. Of course it comes with DOM support for demo purpose and for feature
  completeness but the main purpose is to animate elements of other frameworks (e.g. canvas or [google-]maps-elements).


## Example

  The example shows the animation of an dom element. It animates the dom element in two steps, sleeps for 2 seconds
  and restores the initial properties:

    A('#foo')
      .animate({
        backgroundColor: "red",
        width: 500,
      })
      .animate({ width: 250 })
      .delay(2000)
      .reset()
      ;


## License

(The MIT License)

Copyright (c) 2015 Torsten Sachse &lt;proddi@splatterladder.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

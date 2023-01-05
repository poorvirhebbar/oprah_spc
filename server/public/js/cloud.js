let _pathname = $('.pathname');
let _explorer = $('.explorer');
let _download = $('.download');
let _viewer = $('.viewer');
// let _viewer_wrap = $('.viewer-wrap');
let _upload_file = $('.upload-file');

//https://gist.github.com/72lions/4528834
function pad(buffer) {
  var total = 16 * Math.ceil((buffer.byteLength + 1) / 16);
  var left = total - buffer.byteLength;
  var tmp = new Uint8Array(total);
  console.log(total, left);
  tmp.set(new Uint8Array(buffer), 0);
  let temp = [];
  for (let i = 0; i < left; i++) temp.push(left);
  tmp.set(new Uint8Array(temp), buffer.byteLength);
  return tmp.buffer;
}

function unpad(buffer) {
  var tmp = new Uint8Array(buffer);
  //console.log(tmp.length);
  //console.log(tmp[tmp.length-1]%16)
  return buffer.slice(0, tmp.length - tmp[tmp.length - 1]);
}

// taken from some google employee's blog
function base16(buffer) {
  var hexCodes = [];
  var view = new DataView(buffer);
  for (var i = 0; i < view.byteLength; i += 4) {
    var value = view.getUint32(i);
    var stringValue = value.toString(16);
    var padding = '00000000';
    var paddedValue = (padding + stringValue).slice(-padding.length);
    hexCodes.push(paddedValue);
  }
  return hexCodes.join("");
}

// taken from some google employee's blog
function sha256(str) {
  var buffer = new TextEncoder("utf-8").encode(str);
  return crypto.subtle.digest("SHA-256", buffer).then(function (hash) {
    return hash
  });
}

async function freezeLock() {
  await fetch('/lock/freeze', {
    method: 'get',
    credentials: 'same-origin',
    cache: 'no-cache'
  }).then(res => res.json())
}

async function revokeLock() {
  await fetch('/lock/revoke', {
    method: 'get',
    credentials: 'same-origin',
    cache: 'no-cache'
  }).then(res => res.json())
}

async function setSchema(schema) {
  window.cloudSchema = {
    alg: {
      name: schema[0]
    }
  }
  if (schema[0] == 'AES-CTR') {
    window.cloudSchema.alg.counter = new Uint8Array(16);
    window.cloudSchema.alg.length = 16;
  } else if (schema[0] == 'AES-CBC') {
    window.cloudSchema.alg.iv = new Uint8Array(16);
  }
  let key = await sha256(schema[1]);
  window.keyString = base16(key);
  window.cloudSchema.key = await crypto.subtle.importKey('raw', key, {
    name: schema[0]
  }, true, ['encrypt', 'decrypt']);
}

function encryptBuffer(buffer) {
  buffer = pad(buffer);
  // return new Promise((resolve, reject) => resolve(buffer))
  return crypto.subtle.encrypt(window.cloudSchema.alg, window.cloudSchema.key, buffer)
}

function decryptBuffer(buffer) {
  // return new Promise((resolve, reject) => resolve(buffer))
  return crypto.subtle.decrypt(window.cloudSchema.alg, window.cloudSchema.key, buffer).then(buffer => new Promise((resolve, reject) => {return resolve(unpad(buffer))}))
}

let explorer = {
  _path: null,
  get path() {
    return this._path
  },
  set path(_path) {
    fetch('/api/list', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      cache: 'no-cache',
      body: JSON.stringify({
        path: '/' + _path.join('/')
      })
    }).then(res => res.json()).then(res => {
      res = res.data
      if (res[0].length) {
        _explorer.html(`<tr>
        <td class="text-center"><i class="fas fa-2x"></i></td>
        <td><a class="name" href="#"></a></td>
        <td></td>
        <td></td>
        <td><a class="down" href="#"><i class="fas fa-2x fa-download"></i></a></td>
        <td><a class="dump" href="#" class=""><i class="fas fa-2x fa-trash-alt"></i></a></td>
        </tr>`.repeat(res[0].length))
        console.log(res);
        for (idx in res[0]) {
          let row = _explorer.find(`tr:eq(${idx})`)
          row.find('td:eq(0) i').addClass(res[0][idx] ? 'fa-file' : 'fa-folder')
          row.find('td:eq(1) a').text(res[1][idx]);
          row.find('td:eq(1) a').attr('data-type', res[0][idx]);
          row.find('td:eq(2)').text(res[2][idx])
          row.find('td:eq(3)').text(new Date(res[3][idx]).toLocaleString())
          row.find('td:eq(4) a').attr('data-name', res[1][idx]);
          row.find('td:eq(4) a').attr('data-type', res[0][idx]);
          row.find('td:eq(5) a').attr('data-name', res[1][idx]);
          row.find('td:eq(5) a').attr('data-type', res[0][idx]);
        }
      } else {
        _explorer.html(`<tr><td colspan="4" class="text-center"><i class="far fa-2x fa-folder"></i><br />Folder is empty.</td></tr>`)
      }
      _pathname.html(`<li class="breadcrumb-item"><a href="#"></a></li>`.repeat(1 + _path.length));
      $(_pathname.find('li a')[0]).text('root')
      for (idx = 0; idx < _path.length; idx++) {
        $(_pathname.find('a')[idx + 1]).text(_path[idx])
      }
      explorer._path = _path;
    }).catch((e) => {
      swal('Server-side error', 'Server is not feeling so well.', 'error')
    })
  }
}

_upload_file.find('.file').on('change', () => {
  let cancelled = false;
  swal({
    title: 'Loading...'
  }).then(result => {
    if (result.dismiss) {
      cancelled = true;
    }
  });
  swal.showLoading();
  let f = _upload_file.prop('file').files[0];
  let fileReader = new FileReader();
  fileReader.onload = function (e) {
    encryptBuffer(e.target.result).then(buffer => {
      let formData = new FormData();
      formData.append('file', new Blob([new Uint8Array(buffer)], {
        type: f.type,
        name: f.name
      }));
      formData.append('path', '/' + explorer.path.join('/') + '/' + f.name);
      fetch('/api/lock/freeze', {
        method: 'get',
        cache: 'no-cache',
        credentials: 'same-origin'
      }).then(res => res.json()).then(res => {
        if (res.lock[0]) {
          fetch('/api/upload/file', {
            method: 'post',
            credentials: 'same-origin',
            cache: 'no-cache',
            body: formData
          }).then(res => res.json()).then(res => {
            if (!cancelled) swal.close();
            if (res.status) {
              explorer.path = explorer.path;
              fetch('/api/lock/revoke', {
                method: 'get',
                cache: 'no-cache',
                credentials: 'same-origin'
              })
            } else {
              throw 'Error';
            }
          })
        } else {
          swal.close()
          swal('Locked :(', `somebody is uploading. wait for ${res.lock[1]} seconds.`, 'error')
        }
      }).catch((e) => {
        swal('Server-side error', `server is not feeling so well`, 'error');
        throw e;
      });
    })
    // })
  }
  fileReader.readAsArrayBuffer(f);
});

newFolder = function () {
  swal({
    title: 'Enter new folder name',
    input: 'text',
    inputAttributes: {
      autocapitalize: 'off'
    },
    showCancelButton: true,
    confirmButtonText: 'Create'
  }).then(result => {
    if (result.dismiss) {} else if (result.value && result.value.indexOf('/') == -1) {
      let path = '/' + explorer.path.join('/') + '/' + result.value;
      let cancelled = false;
      swal({
        title: 'Loading...'
      }).then(result => {
        if (result.dismiss) {
          cancelled = true;
        }
      });
      swal.showLoading();
      fetch('/api/create', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        cache: 'no-cache',
        body: JSON.stringify({
          path
        })
      }).then(res => res.json()).then(res => {
        if (!cancelled) swal.close();
        if (!res.status) {
          swal('No can do', 'An idiot dont be', 'error')
        } else {
          explorer.path = explorer.path;
        }
      }).catch(() => swal('Server-side error', 'Server is not feeling so well.', 'error'))
    } else {
      swal('Try to fool me do not', 'An intelligent client I am', 'error');
    }
  }).catch(swal.noop);
}

uploadFile = function () {
  let path = explorer.path;
  _upload_file.find('.path').text('/' + path.join('/'));
  _upload_file.find('.file').trigger('click');
}

uploadFolder = function () {
  swal('To be implemented');
}

_pathname.on('click', 'a', function () {
  explorer.path = explorer.path.slice(0, $(this).index());
});

_explorer.on('click', 'a.name', function () {
  if ($(this).attr('data-type') == '0') {
    explorer.path = explorer.path.concat($(this).text());
  } else {
    let name = $(this).text();
    let cancelled = false;
    swal({
      title: 'Loading...',
      showCancelButton: true
    }).then(result => {
      if (result.dismiss) {
        cancelled = true;
      }
    });
    swal.showLoading();
    fetch('/api/download', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        cache: 'no-cache',
        path: '/' + explorer.path.join('/') + '/' + name
      })
    }).then(res => res.blob()).then(res => {
      let fileReader = new FileReader();
      fileReader.onload = function (e) {
        decryptBuffer(e.target.result).then(buffer => {
          let url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], {
            type: res.type
          }));
          if (!cancelled) {
            swal.close();
            swal({
              title: name,
              html: '<div class="viewer-wrap"><iframe class="viewer"></iframe></div>',
              customClass: 'swal2-popup-big'
            }).then(() => {
              URL.revokeObjectURL(url);
            })
            _viewer = $('.viewer');
            _viewer.attr('src', url);
          }
        }).catch(e => {
          swal.close();
          swal('Wrogn Key', 'Or the file is corrupt. Czech it once.', 'error')
          throw e;
        });
      }
      fileReader.readAsArrayBuffer(res)
    }).catch(() => swal('Server-side error', 'Server is not feeling so well', 'error'));
  }
});

_explorer.on('click', 'a.down', function () {
  if ($(this).attr('data-type') == '0') {
    swal('No folder download', 'Atleast for now. sorry!', 'error')
  } else {
    let name = $(this).attr('data-name');
    let cancelled = false;
    swal({
      title: 'Loading...',
      showCancelButton: true
    }).then(result => {
      if (result.dismiss) {
        cancelled = true;
      }
    });
    swal.showLoading();
    fetch('/api/download', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      cache: 'no-cache',
      body: JSON.stringify({
        path: '/' + explorer.path.join('/') + '/' + name
      })
    }).then(res => res.blob()).then(res => {
      let fileReader = new FileReader();
      fileReader.onload = function (e) {
        decryptBuffer(e.target.result).then(buffer => {
          let url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], {
            type: res.type
          }));
          if (!cancelled) {
            swal.close();
            _download.attr('href', url);
            _download.attr('download', name);
            _download.get(0).click();
            URL.revokeObjectURL(url);
          }
        });
      }
      fileReader.readAsArrayBuffer(res);
    }).catch(() => swal('Server-side error', 'Server is not feeling so well', 'error'));
  }
});

_explorer.on('click', 'a.dump', function () {
  let name = $(this).attr('data-name');
  fetch('/api/remove', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    cache: 'no-cache',
    body: JSON.stringify({
      path: '/' + explorer.path.join('/') + '/' + name
    })
  }).then(res => res.json()).then(res => {
    if (res.status) {
      explorer.path = explorer.path;
    } else {
      swal('Server-side error', 'Server is not feeling so well', 'error')
    }
  }).catch(() => swal('Server-side error', 'Server is not feeling so well', 'error'));
});

function startExplorer() {
  swal({
    title: 'Gibe schema pliz \n Type followed by Key. pliz.',
    input: 'text',
    inputAttributes: {
      autocapitalize: 'off'
    },
    showCancelButton: true,
    confirmButtonText: 'Create'
  }).then(result => {
    if (result.dismiss || !result.value) {
      swal('No can do', 'Cannot use cloud until you give a schema', 'error').then(startExplorer);
    } else {
      let cloudSchema = result.value.split(' ')
      if (['AES-CBC', 'AES-CTR'].indexOf(cloudSchema[0]) != -1) {
        setSchema(cloudSchema).then((e) => {
          swal('Cool!', 'You\'re set to go, until you have a wrogn key :/', 'success').then(() => {
            explorer.path = [];
          })
        }).catch(e => {
          swal('Error', 'There is an error occuring', 'error')
          throw e;
        });
      } else {
        swal('No can do', 'There is an error occuring', 'error').then(startExplorer);
      }
    }
  })
}

startExplorer();
// explorer.path = [];

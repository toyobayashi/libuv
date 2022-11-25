mergeInto(LibraryManager.library, {
  uv_async_poll__sig: 'ipii',
  uv_async_poll__deps: ['$FS', '$SYSCALLS', '$Asyncify', '$safeSetTimeout'],
  uv_async_poll: function (fds, nfds, timeout) {
    function checkFds () {
      var nonzero = 0;
      for (var i = 0; i < nfds; i++) {
        var pollfd = fds + {{{ C_STRUCTS.pollfd.__size__ }}} * i;
        var fd = {{{ makeGetValue('pollfd', C_STRUCTS.pollfd.fd, 'i32') }}};
        var events = {{{ makeGetValue('pollfd', C_STRUCTS.pollfd.events, 'i16') }}};
        var mask = {{{ cDefine('POLLNVAL') }}};
        var stream = FS.getStream(fd);
        if (stream) {
          mask = SYSCALLS.DEFAULT_POLLMASK;
          if (stream.stream_ops.poll) {
            mask = stream.stream_ops.poll(stream);
          }
        }
        mask &= events | {{{ cDefine('POLLERR') }}} | {{{ cDefine('POLLHUP') }}};
        if (mask) nonzero++;
        {{{ makeSetValue('pollfd', C_STRUCTS.pollfd.revents, 'mask', 'i16') }}};
      }
      return nonzero;
    }
    return Asyncify.handleAsync(function () {
      return new Promise(function (resolve, reject) {
        var r = checkFds();
        if (r || (timeout === 0)) {
          resolve(r);
          return;
        }
        var endTime = Date.now() + timeout;
        function check_fds_and_wait() {
          var r = checkFds();
          if (r || ((timeout > 0) && (Date.now() >= endTime))) {
            resolve(r)
          } else {
            safeSetTimeout(check_fds_and_wait, 10);
          }
        }
        safeSetTimeout(check_fds_and_wait, 10)
      })
    })
  }
})

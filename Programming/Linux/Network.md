---
type: Note
---
# Network
## TCP Server and Client

Socket: a handle to refer to a connection or something else.

Handle: an opaque integer used to refer to things that cross an API boundary. On Linux, a handle is called a file descriptor (abbr. fd, nothing to do with files) and it's local to the process.

A handle must be closed when you're done to free the associated resources on the OS side. This is the only thing in common between different types of handles.

TCP connection process:

*   the server invokes `socket()`, asking the OS for a socket. The integer (say, 3) returned by the OS is a generic socket, it doesn't know it's a server yet.
*   the server invokes `bind()` to tell the OS to associate socket 3 with Port 6379.
*   the server invokes `listen(3)` to tell the OS this socket is used to wait for new connections.
*   the server calls `accept()` on socket 3. the code will block here until a client connects. when a client connects, `accept()` returns a new socket 4.
*   socket 3 is still the receptionist, socket 4 is the specific connection to that client.

How does the server create listening and connection sockets:

```c
fd = socket()
bind(fd, address)
listen(fd)
while True:
	conn_fd = accept(fd)  // conn_fd is the connection
	do_something_with(conn_fd)  // this is the conversation
	close(conn_fd)
```

How does the client create connection socket:

```c
fd = socket()
connect(fd, address)
do_something_with(fd)
close(fd)
```

The address passed to `bind()` contains:

*   family: IPv4 or IPv6, e.g. `AF_INET` for IPv4
*   port: the number specific to the server, e.g. 6379 for Redis
*   IP address: the network face to listen on, 0.0.0.0 (`INADDR_ANY`) for most servers, 127.0.0.1 for only accepting connections from inside the computer

The `do_something_with(fd)` usually includes read and write. TCP and UDP share the same socket API, including `send()` and `recv()` methods.

*   For message-based sockets (UDP), each send/recv corresponds to a single packet
*   For byte-stram-based sockets (TCP), each send/recv appends to/consumes from the byte stream

send/recv are a variant of more generic read/write syscalls used for sockets, disk files, pipes, … on Linux.

Why call `setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &val, sizeof(val))` after getting a fd from the OS: When a TCP connection closes, the OS doesn't kill it instantly. It puts the port into a timeout state (`TIME_WAIT`) for about 30-60s to catch any stray packets floating around the internet. `SO_REUSEADDR` tells the OS it can hijack and start the server.

Why initialize `sockaddr_in` as `{0}`, not `{}`: it's the standard C way to zero out the entire struct. `sockaddr_in` struct has a hidden field called `sin_zero` (8 padding bytes). If you don't zero-initialize the struct, these padding bytes will contain garbage memory.

For IPv6, use `sockaddr_in6` instead.

```c
// pointless
struct sockaddr {
    unsigned short  sa_family;      // AF_INET, AF_INET6
    char            sa_data[14];    // useless
};

// IPv4:port
struct sockaddr_in {
    uint16_t       sin_family; // AF_INET
    uint16_t       sin_port;   // port in big-endian
    struct in_addr sin_addr;   // IPv4
};
struct in_addr {
    uint32_t       s_addr;     // IPv4 in big-endian
};

// IPv6: port
struct sockaddr_in6 {
    uint16_t        sin6_family;   // AF_INET6
    uint16_t        sin6_port;     // port in big-endian
    uint32_t        sin6_flowinfo; // ignore
    struct in6_addr sin6_addr;     // IPv6
    uint32_t        sin6_scope_id; // ignore
};
struct in6_addr {
    uint8_t         s6_addr[16];   // IPv6
};

// can store both sockaddr_in & sockaddr_in6
struct sockaddr_storage {
    sa_family_t     ss_family;      // AF_INET, AF_INET6
    char __some_padding[__BIG_ENOUGH_NUMBER];
};
```

`sockaddr_in` and `sockaddr_in6` have different sizes, so struct size is needed:

```c
int bind(int sockfd, const struct sockaddr *addr, socklen_t addrlen);
```

2 ways to store integers in memory:

*   little-endian: the least significant byte comes first (modern)
*   big-endian (network byte order): the most significant byte comes first

Reversing the byte order is called “byte swap”.

`htonl()`: Host to Network Long

*   Host: CPU endian
*   Network: big-endian
*   Long: `uint32_t`

On little-endian CPUs, it's a byte swap. On big-endian CPUs, it does nothing.

Get the address of each side:

*   `getsockname()`: retrieve the local address of a TCP connection
*   `getpeername()`: retrieve the remote address (returned from `accept()`) of a TCP connection
*   `getaddrinfo()`: resolve a domain name into IP address

Follow-up:

*   TCP is a stream, not a packet. How do you determine when a message ends?
*   Non-blocking I/O: what if multiple clients?

## Request-Response Protocol

A protocol usually has 2 levels of structures:

*   a high-level structure to split the byte stream into messages
*   the structure within a message (deserialization), a simple binary protocol (not real Redis protocol):
    *   a 4-byte little-endian integer indicating the length of the message
    *   the variable-length payload

Return values of `read/write`:

*   positive: number of bytes read/written
*   \-1: error
*   0: `read` returns 0 after EOF (end of file/connection)

errno is a Thread Local Gloabl Variable.

*   If the kernel fails, it returns -1 to the C program and writes the specific error code into the errno variable.
*   It keeps the previous value if syscall succeeded.
*   It's a bad old practice in C, a more sensible way:

```c
// returns the error code, outputs the result via a pointer.
int32_t read(int fd, void *buf, size_t size, size_t *actually_read);
```

Why need `read_full()`/`write_all()` wrappers: despite sharing read/write APIs, reading disk files and reading sockets are different.

*   TCP socket: push-based IO.
    *   can return less data under normal conditions
    *   data over a network is pushed by a peer
    *   the remote doesn't need the `read` call before sending data
    *   the kernel allocates a receive buffer to store the data
    *   `read` just copies available data from receive buffer to userspace buffer
    *   similarly, write just appends data to a kernel-side buffer, the actual network transfer is deferred to the OS
    *   if the buffer is full (write) or empty (read), the caller must wait for it to drain / fill. during the wait, the syscall may be interrupted by a signal, causing write to return with partial data or read to return with -1 (read 0 bytes) and errno is `EINTR`, which is not an error.
*   disk file: poll-based IO.
    *   returning less than requested means EOP or an error
    *   data from a local file is polled from disk
    *   data is alsways ready and the file size is known

2 protocol patterns: length-prefixed and delimited

The real Redis protocol is hybrid, use “\\r\\n” as the delimiter for the length prefix (decimal number).

## Concurrent IO Models

Server can handle multiple connections simultaneously with multi-threading:

```c
fd = socket()
bind(fd, address)
listen(fd)
while True:
    conn_fd = accept(fd)
    new_thread(do_something_with, conn_fd)
    # continue to accept the next client without blocking

def do_something_with(conn_fd):
    while not_quiting(conn_fd):
        req = read_request(conn_fd)     # blocks thread
        res = process(req)
        write_response(conn_fd, res)    # blocks thread
    close(conn_fd)
```

Drawbacks:

*   memory usage: many threads means many stacks (local variabls and function calls), memory usage per thread is hard to control.
*   overhead: stateless clients will create many short-lived connections, adding overhead to both latency and CPU usage.

Most modern server apps use event loops (but multi-threading is easier and less error-prone).

The need for multithreading comes from the need to wait for each socket to become ready (rbuf is not empty, and wbuf is not full, this is blocking I/O). We need a way to wait for multiple sockets at once.

```c
while running:
    want_read = [...]           # socket fds
    want_write = [...]          # socket fds
    can_read, can_write = wait_for_readiness(want_read, want_write) # blocks!
    for fd in can_read:
        data = read_nb(fd)      # non-blocking, only consume from the buffer
        handle_data(fd, data)   # application logic without IO
    for fd in can_write:
        data = pending_data(fd) # produced by the application
        n = write_nb(fd, data)  # non-blocking, only append to the buffer
        data_written(fd, n)     # n <= len(data), limited by the available space
```

3 OS mechanisms here:

*   readiness notification: wait for multiple sockets, return when one or more are ready.
*   non-blocking read: assuming the read buffer is not empty, read from it
    *   if rbuf is empty, a non-blocking read would return with `errno = EAGAIN`
    *   non-blocking read can be called repeatedly to fully drain the rbuf
*   non-blocking write: assuming the write buffer is not full, write to it
    *   if wbuf is full, a non-blocking write would return with `errno = EAGAIN`
    *   non-blocking write can be called repeatedly to fully fill the wbuf
    *   if the data is larger than the available wbuf, non-blocking write can do partial write, which a blocking write may block

`accept()` is similar to `read()` in that it also consumes items from a queue.

When the app calls `listen(fd, SOMAXCONN)`, it creates a queue inside the kernel. The queue holds the clients who have finished the 3-way handshake but haven't been talked to by the app yet.

*   `read()`: pops bytes off the receive buffer
*   `accept()`: pops completed connections off the backlog queue

Thus `accept()` blocks waiting for a connection to finish, not a client response.

*   `accept(listening_fd)`: blocks until the client connects (finishes TCP handshake) and returns a `conn_fd`
*   `read(conn_fd)`: blocks until the client sends data

`accept()` also has a non-blocking mode and can provide readiness notifications.

Readiness API: take a list of fds that the program wants to do IO on, then return a list of fds ready for IO.

Waiting for IO readiness is platform-specific, the simplest one on Linux is `poll()`, which takes an array of fds, each with an input flag and an output flag

*   `events` flag indicates whether you want to read (POLLIN), write (POLLOUT), or POLLERR, a socket error that should be notified about
*   `revents` flag returned from the syscall indicates readiness

`poll()` returns a fd list, so we need to map each fd to the `Conn` object. On Unix, an fd is allocated as the smallest available non-negative integer.

```c
int poll(struct pollfd *fds, nfds_t nfds, int timeout);

struct pollfd {
    int   fd;
    short events;   // what we want to monitor (input)
    short revents;  // what actually happened (output)
};
```

Other readiness APIs:

*   `select()`: for WIndows and Linux, similar to `poll()`, but only use 1024 fds, should not be used
*   `epoll_wait()`: Linux-specific, the fd list is not passed as an argument, but is stored in the kernel. more scalable than `poll()` because passing a huge number of fds is inefficient.
*   `epoll_ctl()`: add or modify the fd list
*   `kqueue()`: BSD-specific, similar to `epoll` but requires fewer syscalls because it can batch update the fd list

Readiness APIs can only be used with sockets, pipes, and sth special, e.g. `signalfd`. There are no such buffer for disk files in the kernel, so readiness for a disk file is undefined.


| Type | Method | API | Scalability |
| --- | --- | --- | --- |
| Socket | Thread per connection | `pthread` | low |
| Socket | Process per connection | `fork()` | low |
| Socket | Event loop | `poll()`, `epoll` | high |
| File | Thread pool | `pthread` |     |
| Any | Event loop | `io_uring` | high |

Event Loop

Per-connection state: with an event loop, an application task can span multiple loop iterations, so the state must be stored somewhere.

```c
struct Conn {
    int fd = -1;
    // application's intention, for the event loop
    bool want_read = false;
    bool want_write = false;
    bool want_close = false;
    // buffered input and output
    std::vector<uint8_t> incoming;  // data to be parsed by the application
    std::vector<uint8_t> outgoing;  // responses generated by the application
};
```

*   `Conn::want_read` and `Conn::want_write` represent the fd list for the readiness API
*   `Conn::want_close` tells the event loop to destroy the connection
*   `Conn::incoming` buffers data from the socket for the protocol parser to work on
*   `Conn::outgoing` buffers generated responses that are written to the socket

Workflow: at each loop iteration, if the socket is ready to read

*   do a non-blocking read
*   add new data to the `Conn::incoming` buffer
*   try to parse the accumulated buffer (if no enough data, do nothing)
*   process the parsed message
*   remove the message from `Conn::incoming`

Batching requests without changing the protocol: a pipelined client sends n requests, then waits for n responses. The server still handles each request in order, but it can get multiple requests in 1 read.

*   reduce the number of IOs
*   reduce client-side latency: the client can get multiple responses in 1 RTT (round trip time)

## Key-Value Server

There are 2 classes of data structures for KV store:

*   sorting data structures, e.g. AVL tree, Treap, Trie, B-tree
    *   use comparisons to search, O(logN)
*   2 types of hashtables: open addressing and chaining
    *   use uniformly distributed hash values to search, O(1)
    *   chaining: array of linked lists, or array of trees
    *   open addressing: store KV pairs directly in the array
        *   in case of a collision, find another array slot and use it if it's empty, otherwise, keep probing for more slots (deterministic)

Keys can be non-integer types (e.g. strings, structs), so we reduce arbitrary types to integers with a hash function.

Load Factor: keys / slots. When the max load factor is reached, keys are migrated (rehashed) to an exponentially larger hashtable, which can be triggered by insertion.

2 types of scalability problems:

*   throughput: generic, easy solutions
    *   sharding
    *   read-only replicas
*   latency: domain-specific

Latency issue for hashtable: insertion with resize

Solution: progressive resizing

*   after allocating a hashtable, initializing the slots takes `O(N)`
*   avoid this with `calloc()`, which gets memory from `mmap()` when allocating a large array
*   pages from `mmap()` are allocated and zeroed on the first access (progressively zero-initialized)
*   for smaller arrays, `calloc()` gets memory from the heap, which requires immediate zeroing, but the latency is bounded
*   the threshold between large and small is determined by `libc`
*   `calloc()` is used instead of `malloc()` + `memset()` to avoid `O(N)` initialization latency

How to make data structures generic in C:

*   void \* pointers, drawbacks:
    *   a nested structure of pointers to access data
    *   more dynamic memory management
    *   no type checking

```c
struct Node {
	void *data;  // points to anything
	struct Node *next;
};
```

*   generate code with C macros, drawbacks:
    *   undebuggable, unmaintainable

```c
#define DEFINE_NODE(T) struct Node_ ## T { \
	T data; \
	struct Node_ ## T *next; \
} \
```

Intrusive Data Structure without encapsulation: add structure to data

```c
struct Node {
	struct Node *next;
};

struct MyData {
	int foo;   // data
	Node node; // embedded structure
	// more data...
};

/* Intrusive data structure with a macro */
#define container_of(ptr, T, member) ({                 \
	const typeof( ((T *)0)->member ) *__mptr = (ptr);   \
	(T *)( (char *)__mptr - offsetof(T, member) ); })
MyData *pdata = (MyData *)((char *)pnode - offsetof(MyData, node));
```

where `(T *)0` is an imaginary pointer at address 0, `((T *)0)→member` accesses the field member inside this imaginary struct.

This doesn't crash because code inside `typeof()` will never be executed. It effectively extracts the type of the member field matches with the `ptr` you passed.

Advantages:

*   fast data access without indirections
*   memory management is minimized
*   share data nodes between multiple collections: it's possible for a data node to belong to multiple data structures
*   multiple data types in the same collection
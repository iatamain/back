const rooms = {
    getList(redis, socket, user){
        redis.hgetall('rooms', (rooms) => {
            socket.emit('/rooms/list', rooms);
        })
    },

    connect(redis, socket, user, roomId){
        redis.hset(`room${roomId}`, `usr${user.id}`, 1, result => {
            socket.emit('/rooms/connect', result);
        });
    },

    //TODO: Implement options
    create(redis, socket, user, name, options){
        redis.incr('roomLastId', roomLastId => {
            redis.hmset(`room${roomLastId}`, `usr${user.id}`, 1, 'name', name, result => {
                socket.emit('/rooms/create', result);
            });
        })
    },

    leave(redis, socket, user){
        if(user.roomId){
            redis.hdel(`room${user.roomId}`, `usr${user.id}`, (result) => {
                redis.hlen(`room${user.roomId}`, count => {
                    if(count == 0){
                        redis.del(`room${user.roomId}`, () => {
                            socket.emit('/rooms/leave', result);
                        });
                    }
                    else{
                        socket.emit('/rooms/leave', result);
                    }
                })
            });
        }
        else{
            socket.emit('clientError', 'No roomId assigned to user');
        }
    }
};

module.exports = rooms;
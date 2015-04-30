var argv = require('minimist')(process.argv.slice(2));
var Dockerode = require('dockerode');
var DockerEvents = require('docker-events');
var exec = require('child_process').exec;
var async = require('async');
var is = require('is_js');
//parse options
if (argv.h){
    console.log("--docker=<docker_host>:<docker_port> [optional] default use unix:///var/run/docker.sock");
    process.exit(0);
}
if (argv.docker){
    var options = {
        host: argv.docker.split(':')[0], 
        port: argv.docker.split(':')[1]
    };
} else {
    var options = {
        socketPath: '/var/run/docker.sock'
    };
}
function getIp(input,callback){
    docker.getContainer(input).inspect(function (err, data){
        if(err){
            callback(err);
        } else {
            var ip = data.NetworkSettings.IPAddress;
            var hostname = data.Config.Hostname;
            callback(null,[hostname,ip]);
        }
    })
}


//init
var docker = new Dockerode(options);
var emitter = new DockerEvents({
    docker: docker
});
docker.listContainers(function (err, containers) {
    var list = [];
    for (var i = 0; i < containers.length; i++) {
        list.push(containers[i].Id);
    }
    async.map(list,getIp,function(e,r){
        if(e){
            console.log(e)
        } else {
            var record = r;
            var hostfile = [];
            for (var i = 0; i < r.length; i++) {
                if(is.ipv4(r[i][1])){
                    hostfile.push(r[i][1]+'\t'+r[i][0]);
                }
            }
            fs.writeFileSync('/etc/dnsmasq.d/0host',hostfile.join('\n'));
            exec('dnsmasq',function(error,stdout,stderr){
                if(error){
                    console.log(error);
                    process.exit(1);
                } else {
                    console.log(stdout);
                    console.log(stderr);
                }
            })
        }
    })
});
//watch
emitter.start();
emitter.on("connect", function() {
    console.log("connected to docker api");
});
emitter.on("disconnect", function() {
    emitter.stop();
    console.log('Docker host disconnected');
    process.exit(1);
});

emitter.on("start", function(message) {
    console.log(message);
    docker.listContainers(function (err, containers) {
        var list = [];
        for (var i = 0; i < containers.length; i++) {
            list.push(containers[i].Id);
        }
        async.map(list,getIp,function(e,r){
            if(e){
                console.log(e)
            } else {
                var record = r;
                var hostfile = [];
                for (var i = 0; i < r.length; i++) {
                    if(is.ipv4(r[i][1])){
                        hostfile.push(r[i][1]+'\t'+r[i][0]);
                    }
                }
                fs.writeFileSync('/etc/dnsmasq.d/0host/',hostfile.join('\n'));
                exec('pkill dnsmasq',function(error,stdout,stderr){
                    if(error){
                        console.log(error);
                        process.exit(1);
                    } else {
                        console.log(stdout);
                        console.log(stderr);
                        exec('dnsmasq',function(error,stdout,stderr){
                            if(error){
                                console.log(error);
                                process.exit(1);
                            } else {
                                console.log(stdout);
                                console.log(stderr);
                            }
                        })
                    }
                })
            }
        })
    });
});
var Etcd = require('node-etcd');
var argv = require('minimist')(process.argv.slice(2));
var Dockerode = require('dockerode');
var DockerEvents = require('docker-events');

//parse options
if (argv.h || !argv.etcd){
    console.log("--etcd=<etcd_host>:<etcd_port> required" + "\n" + "--docker=<docker_host>:<docker_port> [optional] default use unix:///var/run/docker.sock");
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
var etc = {
    host:argv.etcd.split(':')[0],
    port:argv.etcd.split(':')[1]
};
var node = options.host.split('.').join('');
//init
var etcd = new Etcd(etc.host, etc.port);
var docker = new Dockerode(options);
var emitter = new DockerEvents({
    docker: docker
});
docker.listContainers(function (err, containers) {
    for (var i = 0; i < containers.length; i++) {
        docker.getContainer(containers[i].Id).inspect(function (e, data){
            var json = {};
            var env = data.Config.Env;
            json.ip = data.NetworkSettings.IPAddress;
            json.uuid = data.Config.Hostname;
            json.deleted = false;
            for (var j = 0; j < env.length; j++) {
                var str = env[j];
                var n = str.indexOf("DOCKER_DNSNAME");
                if (n > -1){
                    // host and multi-host checking
                    json.name = str.split('=')[1];
                }
            }
            etcd.get("dnscluster/" + node + "/" + json.uuid, function(err,data){
                if(err){
                    etcd.set("dnscluster/" + node + "/" + json.uuid, JSON.stringify(json));
                    console.log(json);
                }
            });
            etcd.set("record/change", node);
            console.log('initialized');
        });
    }
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
        for (var i = 0; i < containers.length; i++) {
            docker.getContainer(containers[i].Id).inspect(function (e, data){
                var json = {};
                var env = data.Config.Env;
                json.ip = data.NetworkSettings.IPAddress;
                json.uuid = data.Config.Hostname;
                json.deleted = 0;
                for (var j = 0; j < env.length; j++) {
                    var str = env[j];
                    var n = str.indexOf("DOCKER_DNSNAME");
                    if (n > -1){
                        // host and multi-host checking
                        json.name = str.split('=')[1];
                    }
                }
                etcd.get("dnscluster/" + node + "/" + json.uuid, function(err,data){
                    if(err){
                        etcd.set("dnscluster/" + node + "/" + json.uuid, JSON.stringify(json));
                        console.log(json);
                    }
                })
                etcd.set("record/change", node);
            });
        }
    });
});

emitter.on("die", function(message) {
    console.log(message);
    var uuid = message.id;
    var id = uuid.substring(0,12);
    etcd.get("dnscluster/" + node + "/" + id, function(err, data){
        var json = JSON.parse(data.node.value);
        console.log(json.dnskey);
        etcd.del(json.dnskey);
        console.log(id + ' removed');
    });
    etcd.del("dnscluster/" + node + "/" + id);
    etcd.set("record/change", node);
});

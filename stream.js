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
            var env = data.Config.Env;
            var ip = data.NetworkSettings.IPAddress;
            var name = data.Config.Hostname;
            // for (var j = 0; j < env.length; j++) {
            //     var str = env[j];
            //     var n = str.indexOf("DOCKER_DNSNAME");
            //     if (n > -1){
            //         // host and multi-host checking
            //         name = str.split('=')[1];
            //     }
            // }
            etcd.set("dnscluster/" + node + "/" + name, ip);
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
                var env = data.Config.Env;
                var ip = data.NetworkSettings.IPAddress;
                var name = data.Config.Hostname;
                etcd.set("dnscluster/" + node + "/" + name, ip);
                etcd.set("record/change", node);
                console.log(name + ' : ' + ip + ' updated');
            });
        }
    });
});

emitter.on("die", function(message) {
    console.log(message);
    docker.getContainer(message.id).inspect(function (e, data){
        var ip = data.NetworkSettings.IPAddress;
        etcd.set("dnscluster/" + node + "/" + name, 'delete');
        etcd.set("record/change", node);
        console.log(name + ' : ' + ip + ' removed');
    });
});

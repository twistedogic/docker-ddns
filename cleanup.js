var Docker = require('dockerode');
var argv = require('minimist')(process.argv.slice(2));
//parse options
if (argv.h || !argv.etcd){
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
var docker = new Docker({host: host, port: port});
docker.listContainers({all:true},function(err,containers){
    containers.forEach(function (containerInfo) {
        var status = containerInfo.Status;
        var id = containerInfo.Id;
        if (status.indexOf("Exited") > -1){
            docker.getContainer(id).remove({v:1}, function(e,d){
                console.log("removed " + id);
            })
        }
    });
});

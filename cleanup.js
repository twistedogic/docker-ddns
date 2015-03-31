var Docker = require('dockerode');
var host = process.argv[2] || '10.0.0.131';
var port = process.argv[3] || 4243;
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

var request = require('request');
var Etcd = require('node-etcd');
var argv = require('minimist')(process.argv.slice(2));
if (argv.h || !argv.etcd || !argv.marathon || !argv.etcd.split(':')[1] || !argv.marathon.split(':')[1]){
    console.log(
        "--etcd=<etcd_host>:<etcd_port> required" + "\n" + 
        "--marathon=<marathon_host>:<marathon_port> required" + "\n" + 
        "--domain=<domain> optional default='docker.local.'"
    );
    process.exit(0);
}
//parse options
var domain = argv.domain || 'docker.local.'
var domainkey = domain.split('.').reverse();
domainkey.shift();
domainkey = domainkey.join('/');
var mesos = argv.mesos;
var etc = {
    host:argv.etcd.split(':')[0],
    port:argv.etcd.split(':')[1]
};
var marathon = argv.marathon;
//init
request.del('http://' + marathon + '/v2/apps/skydns');
var etcd = new Etcd(etc.host, etc.port);
var dnsconfig = {
    dns_addr:'0.0.0.0:53',
    ttl:3600,
    nameservers: ['8.8.8.8:53','8.8.4.4:53'],
    domain: domain
};
etcd.set("skydns/config",JSON.stringify(dnsconfig),function(err){
    // if(!err){
    //     request.get('http://' + mesos + '/master/state.json',function(error,res,body){
    //         var slaves = body.activated_slaves;
    //         var 
    //     })
    // };
});
var watcher = etcd.watcher("record/change",{ recursive: true })
watcher.on("change", function(res){
    etcd.get("dnscluster/",{ recursive: true },function(err,data){
        var nodes = data.node.nodes;
        for (var i = 0; i < nodes.length; i++) {
            if(nodes[i].dir){
                var containers = nodes[i];
                for (var j = containers.nodes.length - 1; j >= 0; j--) {
                    var ip = {
                        host:containers.nodes[j].value
                    };
                    var nodekey = containers.nodes[j].key;
                    var key = nodekey.split('/');
                    key = key[key.length - 1];
                    if(ip.host.split('.').length > 2){
                        etcd.set(domainkey + '/' + key, JSON.stringify(ip),{ ttl: 3600 });
                        console.log(key + ' : ' + ip.host + " Updated");
                    } else {
                        etcd.del(domainkey + '/' + key);
                        etcd.del(nodekey);
                        console.log(key + ' : ' + ip.host + " Removed");
                    }
                }
            }
        }
    });
});
// basic logic
// if no name then use docker id; if DOCKER_DNSNAME then use DOCKER_DNSNAME-#-host
// if HA true point to HA proxy
// multiple docker host
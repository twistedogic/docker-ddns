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
domainkey = 'skydns/' + domainkey.join('/');
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
etcd.set("skydns/config",JSON.stringify(dnsconfig));
//watch
var watcher = etcd.watcher("record/change",{ recursive: true })
watcher.on("change", function(res){
    etcd.get("dnscluster/",{ recursive: true },function(err,data){
        var nodes = data.node.nodes;
        for (var i = 0; i < nodes.length; i++) {
            if(nodes[i].dir){
                var containers = nodes[i];
                for (var j = containers.nodes.length - 1; j >= 0; j--) {
                    var nodekey = containers.nodes[j].key;
                    var nodevalue = JSON.parse(containers.nodes[j].value);
                    var ip = nodevalue.ip;
                    var uuid = nodevalue.uuid;
                    var name = nodevalue.name;
                    var deleted = nodevalue.deleted;
                    var dnskey = nodevalue.dnskey;
                    if(name){
                        var dnsname = domainkey + '/' + name; 
                    } else {
                        var dnsname = domainkey + '/' + uuid;
                    }
                    etcd.set(dnsname, JSON.stringify({host:ip}));
                    etcd.set(nodekey, JSON.stringify({
                        uuid: uuid,
                        name: name,
                        deleted: 0,
                        dnskey: dnsname,
                        ip:ip
                    }));
                    console.log(nodekey + " updated");
                }
            }
        }
    });
});
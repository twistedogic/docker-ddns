var Etcd = require('node-etcd');
var etc = {
    host:'10.0.0.124',
    port:4001
};
var etcd = new Etcd(etc.host, etc.port);
etcd.get('localdwa',function(err,data){
    if(!err){
        console.log(data);
    }
})
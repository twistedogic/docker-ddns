FROM google/nodejs:latest
MAINTAINER Jordan Li
RUN apt-get update
VOLUME [ "/etc/dnsmasq.d" ]

RUN apt-get install -y dnsmasq-base procps

RUN echo "user=root" > /etc/dnsmasq.conf
RUN echo "listen-address=0.0.0.0" >> /etc/dnsmasq.conf
RUN echo "resolv-file=/etc/resolv.dnsmasq.conf" >> /etc/dnsmasq.conf
RUN echo "conf-dir=/etc/dnsmasq.d"  >> /etc/dnsmasq.conf
RUN echo "domain=cluster.com"  >> /etc/dnsmasq.conf

RUN echo "nameserver 8.8.8.8" >> /etc/resolv.dnsmasq.conf

WORKDIR /app
ADD dns.js /app/app.js
ADD package.json /app/package.json

EXPOSE 53

RUN npm install
CMD node dns.js
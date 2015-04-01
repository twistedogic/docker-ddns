FROM dockerfile/nodejs
ADD . /data/
RUN npm install
EXPOSE 3000
CMD ["node","app.js"]
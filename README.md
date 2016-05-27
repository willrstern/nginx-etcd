# nginx-etcd
Dynamic Nginx Load Balancing for Docker

* run etcd
* run one or more copies of this container to act as public entry points/load balancers to your cluster
* register services to etcd
* everything works!
  - Nginx notices services and generates a new config
  - it will save ssl certs and use virtual hosts to direct traffic from multiple domains
* see the [docker-compose.yml](https://github.com/willrstern/nginx-etcd/blob/master/docker-compose.yml) file for a full example of the containers needed along with some sample web containers

## Configure Via ENV Vars
* `NGINX_NAME` (required) - so services can determine which nginx lb will balance their traffic
* `NGINX_ETCD_HOST` default `etcd`
* `NGINX_REFRESH` default 5000 - rate at which it refreshes from etcd
* `NGINX_DEBUG` enable lots of logging output
* `SLACK_WEBHOOK` optionally shout on a slack channel when a templated config fails to reload (nginx will keep running with last-good-config).  If for some reason, a service manages create a bad config, service discovery will be frozen until the bad registration is removed from ETCD.

## Expected ETCD structure:
Services should register in the following format:
```yaml
/v2/keys/services:
  web:
    tags:
      nginx: 'primary' #corresponds to NGINX_NAME
    hosts:
      test.com:
        ssl: true #(optional)
        #(optional) combined .key and .crt file replacing line breaks with \n
        cert: "-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQEA..."
        upstream:
          1b9d3522da76: '123.45.67.8:80'
          c7c508e915ed: '123.45.67.9:80'
      test2.com:
        upstream:
          1b9d3522da76: '123.45.67.8:80'
          c7c508e915ed: '123.45.67.9:80'
  api:
    tags:
      nginx: 'primary'
    hosts:
      api.com:
        upstream:
          1abc3ab1c33: '123.45.67.10:3000'
          7dacb15ba5b: '123.45.67.11:3000'
```
* You can now point test.com, test2.com & api.com DNS to the nginx instances
* When the `Host` header is `api.com`, api upstreams will be served, `test.com` will serve `web` upstreams, etc

## SSL Termination
- create a cert
- concatenate the `.key` and `.crt` files
- replace newlines with `\n` and copy the output
- add the combined key & cert into services/<servicename>/host/<hostname>/cert in etcd
- [see here for an example](https://github.com/willrstern/nginx-etcd/blob/master/docker-compose.yml#L45)

## Slack Integration
- Before reloading a config, it runs `nginx -t` to make sure it is valid
- If a config fails, it will continue using the last-good-config until a working config is generated
- Add `SLACK_WEBHOOK=https://hooks.slack.com/services/T02RK...` env var to get notifications when a config fails.

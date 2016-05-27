# docker-cloud-nginx-load-balancing
Dynamic Nginx Load Balancing for Docker Cloud

- All Docker Cloud services are acessible through Docker Cloud's API, this allows us to use Docker Cloud's API for automated service registration & service discovery.
- __No linking or port exposing required.__  When services stop, start, or scale in Docker Cloud, `willrstern/docker-cloud-nginx` containers will notice their private IP addresses.
- This allows `willrstern/docker-cloud-nginx` containers to dynamically load balance all services with `NGINX_LB` ENV variables set.
- If a config fails, it will use the last-good-config.  See Slack integration.

## 1) Docker Cloud Setup
- Create 2 node clusters on Docker Cloud, one with the deploy tag of `apps` and one with the deploy tag of `nginx`.
<br/><img src="https://farm1.staticflickr.com/628/23806789896_555c9f486b.jpg" style="width: 200px;" />
<br/><br/>As the names imply, you will give all of your apps, services, databases, etc an `apps` deploy tag, while only `willrstern/docker-cloud-nginx` containers get the `nginx` tag.  This way, nginx will always be on the exact same IP addresses, so DNS can be assigned to those IP addresses.

- Send all of your DNS entries & subdomains to the `nginx` node IP addresses.
(NOTE: [DynDNS (dyn.com)](http://dyn.com) supports active failover for IP addresses in case a node goes down, this is a great solution for DNS)

## 2) Running the Load Balancer
Run one or more copies of `willrstern/docker-cloud-nginx` on Docker Cloud.
- add the `nginx` deploy tag & choose the `every node` strategy.<br/>
- Choose the autorestart `always` option as well.<br/>![](https://farm2.staticflickr.com/1532/25069136655_10f9bc9719_z.jpg)
- __MAKE SURE__ to choose the `Full Access` API role on the Environment Variables page or the load balancer won't be able to detect running services via the Docker Cloud API.
- Set `NGINX_LB_NAME=prod` env variable.
- Set `CONTAINER_LIMIT` env variable if running more than 25 containers.
- Optionally set `NGINX_NODE_TAGS=tag1,tag2` to restrict to containers running on certain nodes
<br/>![](https://farm2.staticflickr.com/1716/25042790246_3c514d97d4_z.jpg)


The Nginx service will now listen to Docker Cloud's stream API.  As services change, this LB will balance services with the `NGINX_LB=prod` env var. A new Nginx configuration is generated & tested with `nginx -t`.  If Nginx accepts the new configuration, it will reload nginx.


## 3) Load Balancing a Service
Simply run your services on Docker Cloud with the `NGINX_PORT`, `NGINX_VIRTUAL_HOST` and `NGINX_LB` environment variables set in your `Dockerfile`:
```
ENV NGINX_LB prod
ENV NGINX_VIRTUAL_HOST test.com,othersite.com
ENV NGINX_PORT 3000
```

When your service starts, `willrstern/docker-cloud-nginx` will notice each container and immediately reload it's config!

__NOTE__: Apps don't need to expose ports to be load balanced!  Docker Cloud gives each container an IP, so don't add `EXPOSE` to your Dockerfile.

## 4) SSL Termination
- create a cert
- concatenate the `.key` and `.crt` files
- replace newlines with `\\n` and copy the output
```
openssl req -x509 -newkey rsa:2048 -keyout mysite.key -out mysite.crt -days 1080 -nodes -subj '/CN=*/O=My Company Name LTD./C=US'
cat mysite.key mysite.crt > mysite.combined.crt
awk 1 ORS='\\\\n' mysite.combined.crt
```
- add the combined key & cert into `NGINX_CERTS` env var to your `Dockerfile`
```
ENV NGINX_CERTS -----BEGIN RSA PRIVATE KEY-----\\nMIIEogIBAAKCAQEA...and so on
```

If you have multiple `NGINX_VIRTUAL_HOST`s, add a cert for each host with `,` in-between: i.e.
```
ENV NGINX_VIRTUAL_HOST mysite.com,othersite.com
ENV NGINX_CERTS <mysite.com key & cert>,<othersite.com key & cert>
```
or
```
ENV NGINX_VIRTUAL_HOST mysite.com,othersite.com
# only do SSL on othersite.com
ENV NGINX_CERTS ,<othersite.com key & cert>
```

## 5) Slack Integration
- Before reloading a config, it runs `nginx -t` to make sure it is valid
- If a config fails, it will continue using the last-good-config until a working config is generated
- Add `SLACK_WEBHOOK=https://hooks.slack.com/services/T02RK...` env var to get notifications when a config fails.

## Local Development Workflow
- Set the `DOCKERCLOUD_AUTH` & `NGINX_LB_NAME` environment variables and run `npm start`:
```
$ DOCKERCLOUD_AUTH="Basic ...." NGINX_LB_NAME=prod npm start
```
It will now watch your Docker Cloud cluster for events and generate a config to `./default.conf`
  - __How do I get the `DOCKERCLOUD_AUTH` variable?__
    - Run any service on Docker Cloud with the `Full Access` API role on the environment variables page.
    - Now inspect the running service's `Environment Variables` tab to see the `DOCKERCLOUD_AUTH` value.

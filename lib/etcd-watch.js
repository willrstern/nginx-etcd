import Etcd from "node-etcd"
import flatten from "etcd-flatten"
import set from "object-set"

const { NGINX_ETCD_HOST } = process.env
const etcd = new Etcd(NGINX_ETCD_HOST || "etcd")

export default function getServices(cb) {
  etcd.get("services", {recursive: true}, (err, response) => {
    if (err) {
      return console.log("Error fetching services from Etcd", err);
    }
    const services = parseServices(response)
    cb(services);
  })
}

function parseServices(response) {
  const services = {}
  const flattened = flatten(response.node)

  //replace dots with something unliekly to monkey patch hostnames e.g. test.com => test*^*com
  Object.keys(flattened).forEach((key) => {
    const dotKey = key.replace(/\./g, "*^*").replace(/\//g, ".")
    set(services, dotKey, flattened[key])
  })

  //convert upstreams from [{id: upstream}], to [upstream]
  Object.keys(services.services)
    .forEach((serviceName) => {
      const service = services.services[serviceName]
      if (service.hosts) {
        Object.keys(service.hosts)
          .forEach((key) => {
            const host = service.hosts[key]
            const upstream = []

            Object.keys(host.upstream).forEach((key) => {
              upstream.push(host.upstream[key])
            })

            host.upstream = upstream;
          })
      }
    })

  return services.services;
}

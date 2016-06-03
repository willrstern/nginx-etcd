import axios from "axios"
import checksum from "checksum"
import fs from "fs"
import { execSync } from "child_process"
import { find, intersection, sortBy, snakeCase, trim } from "lodash"

import nginxTemplate from "./nginx-template"

const { NGINX_DEBUG, NGINX_NAME, SLACK_WEBHOOK: slackWebhook } = process.env
const configFileName = process.env.NGINX_CONFIG_FILE || "/etc/nginx/conf.d/default.conf"
const certsPath = process.env.NGINX_CERTS || "/certs"

try {
  fs.mkdirSync(certsPath)
} catch(e) {}

/***
 RUN
***/
export default function(services) {
  const configs = parseServices(services)

  if (configs.length) {
    const newNginxConf = nginxTemplate.render({ configs })

    //reload nginx if config has changed
    checksum.file(configFileName, (err, sum) => {
      if (sum !== checksum(newNginxConf)) {
        reloadNginxConfig(newNginxConf)
      }
    })
  }
}


export function parseServices(services) {
  const configs = []
  //grab config from each service
  Object.keys(services)
    .filter(serviceName => services[serviceName].tags && services[serviceName].tags.nginx === NGINX_NAME)
    .forEach((serviceName) => {
      const service = services[serviceName];

      Object.keys(service.hosts)
        .forEach((key) => {
          //replace monkey patched dots in host name
          const host = key.replace(/\*\^\*/g, ".")
          const { cert, ssl, upstream } = service.hosts[key]

          const upstreamName = snakeCase(host)
          //write cert file if provided
          if (ssl && cert) {
            fs.writeFileSync(`${certsPath}/${host}.crt`, trim(cert).replace(/\\n/g, "\n"))
          }

          configs.push({
            host,
            ssl,
            upstream: upstream.sort(),
            upstreamName,
          })
        })
    })

  if (configs.length && NGINX_DEBUG === "true") {
    console.log(configs)
  } else if (!configs.length) {
    console.log("There are no services to load balance")
  }

  return sortBy(configs, "host")
}

export function reloadNginxConfig(config) {
  fs.writeFileSync(configFileName, config)
  const testCmd = process.env.NGINX_RELOAD === "false" ? "" : "nginx -t"
  const reloadCmd = process.env.NGINX_RELOAD === "false" ? "" : "service nginx reload"
  console.log("Testing new Nginx config...")

  try {
    execSync(testCmd)
    execSync(reloadCmd)
    console.log('Nginx reload of /etc/nginx/conf.d/default.conf was successful')

    if (NGINX_DEBUG === "true") {
      console.log(config)
    }

  } catch(e) {
    configFailed(config, e)
  }
}

export function configFailed(config, stderr) {
  console.log("Nginx config failed", stderr)
  console.log(config)

  if (slackWebhook) {
    const text = `Nginx (${NGINX_NAME}) config failed:
*Error:*
\`\`\`${stderr}\`\`\`
*Config:*
\`\`\`${config}\`\`\`
    `

    axios.post(slackWebhook, {text, username: `Nginx ${NGINX_NAME}`})
  }
}

import assert from "assert"
import axios from "axios"
import { execSync } from "child_process"
import { readFileSync } from "fs"
import { find, snakeCase } from "lodash"
import nginxConfigParser from "nginx-config-parser"

import getServices from "../lib/etcd-watch"
import reloadNginx from "../lib/reload-nginx"
import { getContainersToBalance, parseServices, generateNewConfig } from "../lib/reload-nginx"

describe("nginx", function() {
  before(function(done) {
    getServices(reloadNginx)

    setTimeout(() => {
      const nginxConfigFile = readFileSync("/etc/nginx/conf.d/default.conf", "utf-8")
      this.config = nginxConfigParser.parseFromString( nginxConfigFile, 'utf-8')
      done()
    }, 1000)
  })

  describe("config", function() {
    it("is accepted by nginx", () => {
      execSync("nginx -t")
    })

    describe("upstreams", function() {
      it("contains running test.com upstream nodes", function() {
        const upstream = this.config["upstream test_com"][0].server;

        assert(hasUpstream(upstream, "web:80"))
        assert(hasUpstream(upstream, "web2:80"))
        assert(!hasUpstream(upstream, "api:80"))
      })

      it("contains running test2.com upstream nodes", function() {
        const upstream = this.config["upstream test_2_com"][0].server;

        assert(hasUpstream(upstream, "web:80"))
        assert(hasUpstream(upstream, "web2:80"))
        assert(!hasUpstream(upstream, "api:80"))
      })

      it("contains running api.com upstream node", function() {
        const upstream = this.config["upstream api_com"][0].server;

        assert(hasUpstream(upstream, "api:80"))
        assert(!hasUpstream(upstream, "web:80"))
        assert(!hasUpstream(upstream, "web1:80"))
      })
    })

    describe("servers", () => {
      it("proxy_pass points to correct upstream for virtual hosts", function() {
        const hosts = ["test.com", "test2.com", "api.com"];

        hosts.forEach((host) => {
          assert.equal(getProxyPass(this.config.server, host), `http://${snakeCase(host)}`);
        })
      })
    })

    describe("certs", () => {
      it("writes cert files when provided", function() {
        const apiCert = readFileSync("/certs/api.com.crt", "utf-8")
        const apiCertExpected = readFileSync(__dirname + "/mocks/api.com.crt", "utf-8")

        assert.equal(apiCert, apiCertExpected)
      })
    })
  })
})


function hasUpstream(upstream, url) {
  let exists = false;
  upstream.forEach((val) => {
    if (Array.isArray(val) && val[0] === url) {
      exists = true;
    }
  })
  return exists;
}

function getProxyPass(servers, serverName) {
  const server = getServer(servers, serverName);
  return server["location /"][0].proxy_pass[0][0];
}

function getServer(servers, serverName) {
  for (let i=0; i < servers.length; i++) {
    if (servers[i].server_name[0][0] === serverName) {
      return servers[i]
    }
  }
}


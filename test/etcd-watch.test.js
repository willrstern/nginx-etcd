import assert from "assert"
import fs from "fs"
import getServices from "../lib/etcd-watch"

const apiCert = "-----BEGIN RSA PRIVATE KEY-----\nMIICXQIBAAKBgQC/G6eud0cQqqI729F+uxT1Zv1HLpqz/qOc/3GjtZohNUyOCJK0\ngoiiNwz9nNy62Q3iAknW/EP6TKNfiN1AFNsqECsxOku0mUAyvERLeBfWpXVXTi27\n7ml7KXoVhhDxPj3/PDsgyvrEsQ8e9/jDvkzovSKyfMJa0shbi6gwzJr+awIDAQAB\nAoGBAK0yoBZzDVnieyOqxcOIQ6dgjlzrtNM6DQglTdVjqWs9RcNXq7Wis7foEoLq\nnfVM79ML5eXMPMNkn4/elz4TaMe1tQKzeevy7waLEjLDlrtqQs4duX4ulUhQvDr2\nZnWLiaoGIN/K+QnHzR1k7Kj07sT8PL3gIwqtqRdDBSO4ljIRAkEA6wMZ/OxKJCH6\nlKQ3C+7wlXttmBhkGQpzjvC0E8yJFR2ui/SCnvL75OD5+2pDUGpoXaIeCXDAisWN\nAi/KZ9bF2QJBANAszwEUeU1cjf6vPTxrLOzcVLZSdgr3NBe8IAUtE46jL3rdfWlQ\nAYPmXfmRynLk8hZM3LgJFM1gO8JrFTJBp+MCQE3UUR76AfPFbP8dAz3oe7SFk93y\n9fN1CqAkBv8nlZ5wngWrjDansdQyzZb9sh1HoBiiP+BQfvN2SSSYPyf0cMECQQC2\nkQV92fnDyc7Rs9eNXCTLGTPFra3OUhvCUP736x9CsYRbSVHKARtDFM4HqD8W4ggZ\nXJEZaQVwU9w01fqB16inAkBW5FWZixHCqHrDHMKevB+VRGtr94s0yOAxUZPPEAT/\nwIBs4GGlzYk6sPgp8vMOHCtoox2JjzzgiZCsU2HObLS/\n-----END RSA PRIVATE KEY-----\n-----BEGIN CERTIFICATE-----\nMIIB8TCCAVoCCQCrK/E7Wz0CxTANBgkqhkiG9w0BAQUFADA9MQswCQYDVQQGEwJV\nUzELMAkGA1UECBMCVFgxITAfBgNVBAoTGEludGVybmV0IFdpZGdpdHMgUHR5IEx0\nZDAeFw0xNjAyMjMxNzUxMzBaFw0xNzAyMjIxNzUxMzBaMD0xCzAJBgNVBAYTAlVT\nMQswCQYDVQQIEwJUWDEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRk\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC/G6eud0cQqqI729F+uxT1Zv1H\nLpqz/qOc/3GjtZohNUyOCJK0goiiNwz9nNy62Q3iAknW/EP6TKNfiN1AFNsqECsx\nOku0mUAyvERLeBfWpXVXTi277ml7KXoVhhDxPj3/PDsgyvrEsQ8e9/jDvkzovSKy\nfMJa0shbi6gwzJr+awIDAQABMA0GCSqGSIb3DQEBBQUAA4GBAAQG+EhyuEQleHRg\nuZZnGKIYbeODAWTY4UOVNjV2AItHWk/yPDbPoxhj9e1iC7JdKHgJTLaJw0JzLuXx\nmPvyczvXfORsTv0Isc3JH71xhZ2GLX10rhQKBzIzud6CwopFmfdAAM0/z4gJ67JZ\noAPJD828GizKayML5BIu3hQSufiy\n-----END CERTIFICATE-----"

describe("etcd-watch", () => {
  beforeEach(function (done) {
    getServices((services) => {
      this.services = services
      done()
    })
  })

  it("sets nginx name tags", function() {
    const { web, api } = this.services
    assert.equal(web.tags.nginx, "primary")
    assert.equal(api.tags.nginx, "primary")
  })

  it("sets service ssl=true when cert is provided", function() {
    const { api } = this.services
    assert(api.hosts["api*^*com"].ssl)
  })

  it("does not set service ssl=true when no cert is provided", function() {
    const { web } = this.services
    assert.equal(web.hosts["test*^*com"].ssl, undefined)
  })

  it("sets ssl cert when cert is provided", function() {
    const { api } = this.services
    assert.equal(api.hosts["api*^*com"].cert, apiCert)
  })

  it("does not set ssl cert when no cert is provided", function() {
    const { web } = this.services
    assert.equal(web.hosts["test*^*com"].cert, undefined)
  })

  it("sets upstream:port for each host", function() {
    const { web } = this.services
    const { "test*^*com": test, "test2*^*com": test2 } = web.hosts
    assert(~test.upstream.indexOf("web:80"))
    assert(~test.upstream.indexOf("web2:80"))
    assert(~test2.upstream.indexOf("web:80"))
    assert(~test2.upstream.indexOf("web2:80"))
  })
})

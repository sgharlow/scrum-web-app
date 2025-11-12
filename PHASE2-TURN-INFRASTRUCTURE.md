# Phase 2: TURN Infrastructure Implementation

## Overview

Phase 1 improvements added TCP TURN servers, better retry logic, and diagnostics. Phase 2 focuses on deploying reliable, dedicated TURN infrastructure to achieve >95% connection success rates.

## Current State vs. Target

### Current (After Phase 1)
- **Free, public TURN servers** (openrelay.metered.ca, numb.viagenie.ca, freeturn.net)
- **Expected success rate**: 75-85%
- **Issues**:
  - Shared infrastructure with unpredictable availability
  - Rate limiting on public credentials
  - Geographic distance may cause latency
  - No SLA or guarantees

### Target (Phase 2)
- **Dedicated TURN infrastructure** with SLA
- **Expected success rate**: >95%
- **Benefits**:
  - Guaranteed uptime and capacity
  - No rate limiting
  - Geographic distribution for low latency
  - Full control and monitoring

## Implementation Options

### Option A: Self-Hosted coturn (Recommended for Cost)

**Description**: Deploy coturn (open-source TURN server) on GCP infrastructure.

**Architecture**:
```
┌─────────────────┐
│   Cloud Run     │ <- Existing Scrum App
│   (Scrum App)   │
└─────────────────┘
        ↓
┌─────────────────┐
│  Compute Engine │ <- New: TURN Server
│  (coturn)       │    - UDP: 3478
│                 │    - TCP: 3478
│                 │    - TLS: 5349
└─────────────────┘
```

**Implementation Steps**:

1. **Provision VM Instance**
   ```bash
   gcloud compute instances create scrum-turn-server \
     --zone=us-central1-a \
     --machine-type=e2-micro \
     --image-family=debian-11 \
     --image-project=debian-cloud \
     --tags=turn-server
   ```

2. **Configure Firewall Rules**
   ```bash
   # Allow TURN traffic
   gcloud compute firewall-rules create allow-turn-udp \
     --allow=udp:3478,udp:49152-65535 \
     --target-tags=turn-server

   gcloud compute firewall-rules create allow-turn-tcp \
     --allow=tcp:3478,tcp:49152-65535 \
     --target-tags=turn-server

   # Optional: TURN over TLS
   gcloud compute firewall-rules create allow-turns \
     --allow=tcp:5349 \
     --target-tags=turn-server
   ```

3. **Install and Configure coturn**
   ```bash
   # SSH into the instance
   gcloud compute ssh scrum-turn-server --zone=us-central1-a

   # Install coturn
   sudo apt-get update
   sudo apt-get install -y coturn

   # Enable coturn service
   sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
   ```

4. **Configure /etc/turnserver.conf**
   ```conf
   # Listener IPs and ports
   listening-port=3478
   tls-listening-port=5349

   # External IP (get from: curl ifconfig.me)
   external-ip=YOUR_VM_EXTERNAL_IP

   # Relay configuration
   relay-ip=YOUR_VM_INTERNAL_IP
   min-port=49152
   max-port=65535

   # Authentication
   lt-cred-mech
   user=scrum:GENERATE_STRONG_PASSWORD
   realm=scrum.yourdomain.com

   # Logging
   log-file=/var/log/turnserver.log
   verbose

   # Security
   fingerprint
   no-multicast-peers
   no-cli

   # Performance
   total-quota=0
   stale-nonce=600
   ```

5. **Start coturn**
   ```bash
   sudo systemctl enable coturn
   sudo systemctl start coturn
   sudo systemctl status coturn
   ```

6. **Update App.tsx ICE Configuration**
   ```javascript
   'iceServers': [
     // STUN servers (keep existing)
     { urls: 'stun:stun.l.google.com:19302' },

     // Your dedicated TURN server (add at TOP for priority)
     {
       urls: [
         'turn:YOUR_VM_IP:3478',
         'turn:YOUR_VM_IP:3478?transport=tcp',
         'turns:YOUR_VM_IP:5349?transport=tcp' // TLS optional
       ],
       username: 'scrum',
       credential: 'YOUR_STRONG_PASSWORD'
     },

     // Keep free TURN servers as backup...
   ]
   ```

**Cost Estimate**:
- **VM (e2-micro)**: $7-8/month (24/7)
- **Egress traffic**: ~$0.01/GB (estimated $2-5/month for small team)
- **Total**: **$10-15/month**

**Pros**:
- Full control and customization
- Low cost for small-medium usage
- Can scale vertically or add more instances
- Data stays within your GCP project

**Cons**:
- Requires infrastructure management
- Need to handle security updates
- Single point of failure (can add multiple instances)

---

### Option B: Managed TURN Service (Recommended for Simplicity)

**Description**: Use a third-party managed TURN service.

#### B1: Twilio Network Traversal Service

**Implementation**:
```javascript
// 1. Sign up at twilio.com
// 2. Get API credentials from console
// 3. Create server-side endpoint to generate tokens (can't expose creds in frontend)

// Backend endpoint (Node.js example):
const twilio = require('twilio');
app.get('/api/ice-servers', (req, res) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = twilio(accountSid, authToken);

  client.tokens.create()
    .then(token => res.json(token.iceServers))
    .catch(err => res.status(500).json({ error: err }));
});

// Frontend:
const response = await fetch('/api/ice-servers');
const iceServers = await response.json();
// Use iceServers in Peer configuration
```

**Cost**: Pay-as-you-go, ~$0.0005/minute per participant (roughly $0.03/hour, $1-5/month for small usage)

**Pros**:
- Extremely reliable (99.99% uptime SLA)
- Global edge network for low latency
- No infrastructure management
- Scales automatically

**Cons**:
- Requires backend endpoint (can't expose tokens in frontend)
- More expensive at scale
- Adds dependency on Twilio

#### B2: Xirsys

**Implementation**:
```javascript
// Get ICE servers from Xirsys API
const getXirsysIceServers = async () => {
  const response = await fetch('https://global.xirsys.net/_turn/YOUR_IDENT', {
    method: 'PUT',
    headers: {
      'Authorization': 'Basic ' + btoa('YOUR_USERNAME:YOUR_SECRET'),
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  return data.v.iceServers;
};

// Use in Peer config
const iceServers = await getXirsysIceServers();
```

**Cost**:
- **Free tier**: 50 GB/month transfer
- **Paid**: Starting at $12/month for 100 GB

**Pros**:
- WebRTC specialists
- Simple API
- Good free tier for testing
- Global infrastructure

**Cons**:
- Less known than Twilio
- Requires API calls (can be cached)

#### B3: Cloudflare Calls (Beta)

**Status**: Currently in beta, monitor for general availability

**Expected Cost**: TBD, likely competitive

**Pros**:
- Cloudflare's global network
- Likely good pricing
- Easy integration with other Cloudflare services

**Cons**:
- Not yet GA
- Pricing unclear

---

### Option C: Multi-Region Self-Hosted (For Scale)

**Description**: Deploy coturn instances in multiple regions for redundancy and low latency.

**Architecture**:
```
US-Central coturn ─┐
                   ├─> Load balanced / Round-robin
US-East coturn ────┤
                   │
EU-West coturn ────┘
```

**Cost**: 3x Option A = **$30-45/month**

**When to consider**:
- >500 active users
- Global user base requiring low latency
- Need high availability (99.9%+)

---

## Recommendation Matrix

| Scenario | Recommendation | Rationale |
|----------|---------------|-----------|
| **MVP / Small team (<20 users)** | Option A (Self-hosted) | Cost-effective, full control |
| **Growing product (20-100 users)** | Option B2 (Xirsys) | Managed, scales with you |
| **Production app (100+ users)** | Option B1 (Twilio) | Enterprise reliability |
| **Global/High-scale** | Option C (Multi-region) | Best performance everywhere |

## Migration Path

### Immediate (Phase 2A)
1. Deploy Option A (coturn on e2-micro)
2. Test with 10-20 users
3. Monitor success rates and latency
4. Keep free TURN servers as fallback

### 3-6 Months (Phase 2B)
1. Based on usage patterns, evaluate need for:
   - More capacity (upgrade VM)
   - More regions (add instances)
   - Managed service (migrate to Twilio/Xirsys)

### Long-term (Phase 2C)
1. Implement monitoring/alerting for TURN health
2. Add automatic failover between TURN servers
3. Optimize based on actual user connection patterns

---

## Testing Plan

After implementing Phase 2:

1. **Local Testing**: Verify TURN server responds
   ```bash
   # Test with turnutils
   turnutils_uclient -v -p 3478 YOUR_VM_IP
   ```

2. **Browser Testing**: Use webrtc-internals
   - Open: `chrome://webrtc-internals`
   - Join room and check ICE candidates
   - Verify "relay" candidates appear
   - Confirm successful connections use TURN when needed

3. **Network Testing**:
   - Test on same WiFi (should use host/srflx)
   - Test on different networks (should use relay)
   - Test on restrictive corporate network (should use relay with TCP)
   - Test on mobile data (should work reliably)

4. **Load Testing**:
   - Simulate 10-20 concurrent users
   - Monitor TURN server CPU/memory/bandwidth
   - Verify <95% success rate
   - Measure connection time (target: <5 seconds)

---

## Monitoring & Alerting

### Key Metrics to Track

1. **Connection Success Rate**: % of users who successfully join rooms
2. **Connection Time**: Time from join attempt to successful connection
3. **ICE Candidate Types**: % of connections using host/srflx/relay
4. **TURN Server Health**:
   - CPU utilization
   - Memory usage
   - Bandwidth usage
   - Active sessions

### Recommended Tools

- **GCP Monitoring**: For VM metrics
- **Grafana + Prometheus**: For coturn metrics (optional)
- **Application Insights**: Log connection stats from browser console
- **Uptime Monitoring**: Pingdom or UptimeRobot for TURN availability

---

## Security Considerations

1. **Credential Rotation**: Change TURN credentials every 90 days
2. **Rate Limiting**: Configure coturn to prevent abuse
3. **Firewall Rules**: Only open required ports
4. **TLS**: Use TURNS (TURN over TLS) for sensitive data
5. **Auth Tokens**: Consider time-limited credentials (REST API)

---

## Rollback Plan

If Phase 2 TURN infrastructure fails:

1. App automatically falls back to free TURN servers (already configured as backup)
2. No user impact beyond temporary connection issues
3. Monitor logs to identify root cause
4. Fix and redeploy

---

## Success Criteria

Phase 2 is considered successful when:

- [ ] Connection success rate >95% (measured over 1 week)
- [ ] Average connection time <5 seconds
- [ ] TURN server uptime >99.5%
- [ ] Zero cost overruns (within budget)
- [ ] Positive user feedback on connection reliability

---

## Timeline Estimate

| Task | Duration | Owner |
|------|----------|-------|
| Provision VM & install coturn | 2 hours | DevOps |
| Configure & test coturn | 2 hours | DevOps |
| Update app code & deploy | 1 hour | Dev |
| Testing (various networks) | 4 hours | QA/Dev |
| Monitor for 1 week | 1 week | Team |
| **Total** | **~1.5 weeks** | |

---

## Resources

- [coturn GitHub](https://github.com/coturn/coturn)
- [coturn Configuration Guide](https://github.com/coturn/coturn/wiki/turnserver)
- [WebRTC TURN Guide](https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/)
- [Twilio Network Traversal](https://www.twilio.com/docs/stun-turn)
- [Xirsys Documentation](https://docs.xirsys.com/)

---

## Questions / Decisions Needed

- [ ] What is the expected monthly user count?
- [ ] What is the budget for infrastructure?
- [ ] Do we need multi-region from day 1?
- [ ] Do we have backend infrastructure for Twilio token generation?
- [ ] What is acceptable downtime for TURN service?

---

*Document Version: 1.0*
*Last Updated: 2025-11-12*
*Author: Claude Code*

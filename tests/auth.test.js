
import request from "supertest";
import { app } from "../server.js";
import { setupDB, registerOrg, inviteMember } from "../helpers/helper.js"

setupDB();

describe("Auth", () => {

  describe("POST /api/auth/register-org", () => {
    it("should register organization and owner", async () => {
      const { status, body } = await registerOrg("Acme Corp", "john@acme.com");

      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.user.role).toBe("owner");
      expect(body.organization.slug).toBe("acme-corp");
    });

    it("should set httpOnly cookie on register", async () => {
      const agent = request.agent(app);

      const res = await agent
        .post("/api/auth/register-org")
        .send({
          orgName: "Cookie Org",
          name: "Test",
          email: "cookie@test.com",
          password: "password123",
        });

      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should not register with duplicate email", async () => {
      await registerOrg("Org One", "same@email.com");

      const agent = request.agent(app);
      const res = await agent
        .post("/api/auth/register-org")
        .send({
          orgName: "Org Two",
          name: "Another",
          email: "same@email.com",
          password: "password123",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Email already exists");
    });

    it("should not register duplicate org name", async () => {
      await registerOrg("Same Org", "first@test.com");

      const agent = request.agent(app);
      const res = await agent
        .post("/api/auth/register-org")
        .send({
          orgName: "Same Org",
          name: "Another",
          email: "other@test.com",
          password: "password123",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Organization name already taken");
    });

    it("should fail without required fields", async () => {
      const agent = request.agent(app);
      const res = await agent
        .post("/api/auth/register-org")
        .send({ orgName: "Test" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login and set cookie", async () => {
      await registerOrg("Login Org", "login@test.com");

      const agent = request.agent(app);
      const res = await agent
        .post("/api/auth/login")
        .send({ email: "login@test.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should fail with wrong password", async () => {
      await registerOrg("Wrong Pass", "wrong@test.com");

      const agent = request.agent(app);
      const res = await agent
        .post("/api/auth/login")
        .send({ email: "wrong@test.com", password: "wrongpassword" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("should fail with non-existent email", async () => {
      const agent = request.agent(app);
      const res = await agent
        .post("/api/auth/login")
        .send({ email: "nobody@test.com", password: "password123" });

      expect(res.status).toBe(401);
    });

    it("should access protected route after login", async () => {
      const { agent } = await registerOrg("Protected", "protected@test.com");

      // Agent already has cookie — no extra setup needed
      const res = await agent.get("/api/projects");
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout and clear cookie", async () => {
      const { agent } = await registerOrg("Logout Org", "logout@test.com");

      const res = await agent.post("/api/auth/logout");
      expect(res.status).toBe(200);

      // After logout — protected route should fail
      const protectedRes = await agent.get("/api/projects");
      expect(protectedRes.status).toBe(401);
    });

    it("should not logout without cookie", async () => {
      const agent = request.agent(app);
      const res = await agent.post("/api/auth/logout");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/invite", () => {
    it("should allow owner to invite member", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "Invite Org",
        "owner@invite.com"
      );

      const res = await ownerAgent
        .post("/api/auth/invite")
        .send({
          name: "New Member",
          email: "member@invite.com",
          password: "password123",
          role: "member",
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("member");
    });

    it("should allow owner to invite admin", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "Admin Invite",
        "oi@test.com"
      );

      const res = await ownerAgent
        .post("/api/auth/invite")
        .send({
          name: "New Admin",
          email: "admin@invite.com",
          password: "password123",
          role: "admin",
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("admin");
    });

    it("should not allow member to invite", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "Member Invite",
        "mio@test.com"
      );
      const { agent: memberAgent } = await inviteMember(
        ownerAgent,
        "member",
        "m@mio.com"
      );

      const res = await memberAgent
        .post("/api/auth/invite")
        .send({
          name: "Another",
          email: "another@test.com",
          password: "password123",
          role: "member",
        });

      expect(res.status).toBe(403);
    });

    it("should not allow viewer to invite", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "Viewer Invite",
        "vio@test.com"
      );
      const { agent: viewerAgent } = await inviteMember(
        ownerAgent,
        "viewer",
        "v@vio.com"
      );

      const res = await viewerAgent
        .post("/api/auth/invite")
        .send({
          name: "Another",
          email: "another2@test.com",
          password: "password123",
        });

      expect(res.status).toBe(403);
    });

    it("should not invite duplicate email", async () => {
      const { agent } = await registerOrg("Dup Invite", "di@test.com");

      await agent.post("/api/auth/invite").send({
        name: "Member",
        email: "dup@test.com",
        password: "password123",
        role: "member",
      });

      const res = await agent.post("/api/auth/invite").send({
        name: "Member Again",
        email: "dup@test.com",
        password: "password123",
        role: "member",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Email already exists");
    });
  });
}); 
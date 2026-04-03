import request from "supertest";
import { app } from "../server.js";
import {
  setupDB,
  registerOrg,
  inviteMember,
  createProject,
} from "./helpers.js";

setupDB();

describe("Projects", () => {

  describe("POST /api/projects", () => {
    it("should create project", async () => {
      const { agent } = await registerOrg("Create Org", "cp@test.com");

      const res = await agent
        .post("/api/projects")
        .send({ title: "My Project", description: "Test" });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe("My Project");
    });

    it("should not create without title", async () => {
      const { agent } = await registerOrg("No Title", "nt@test.com");

      const res = await agent
        .post("/api/projects")
        .send({ description: "No title" });

      expect(res.status).toBe(400);
    });

    it("should not allow viewer to create", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "Viewer Org",
        "vo@test.com"
      );
      const { agent: viewerAgent } = await inviteMember(
        ownerAgent,
        "viewer",
        "viewer@test.com"
      );

      const res = await viewerAgent
        .post("/api/projects")
        .send({ title: "Viewer Project" });

      expect(res.status).toBe(403);
    });

    it("should not create without auth", async () => {
      const agent = request.agent(app);
      const res = await agent
        .post("/api/projects")
        .send({ title: "No Auth" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/projects", () => {
    it("should return paginated projects", async () => {
      const { agent } = await registerOrg("Paginate", "pag@test.com");

      await createProject(agent, "Project 1");
      await createProject(agent, "Project 2");
      await createProject(agent, "Project 3");

      const res = await agent.get("/api/projects?page=1&limit=2");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.totalPages).toBe(2);
      expect(res.body.pagination.hasNext).toBe(true);
      expect(res.body.pagination.hasPrev).toBe(false);
    });

    it("should return page 2 correctly", async () => {
      const { agent } = await registerOrg("Page2", "p2@test.com");

      await createProject(agent, "P1");
      await createProject(agent, "P2");
      await createProject(agent, "P3");

      const res = await agent.get("/api/projects?page=2&limit=2");

      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.hasPrev).toBe(true);
      expect(res.body.pagination.hasNext).toBe(false);
    });

    it("should filter by status", async () => {
      const { agent } = await registerOrg("Filter", "filter@test.com");

      await createProject(agent, "Active");
      const p2 = await createProject(agent, "To Archive");

      await agent
        .put(`/api/projects/${p2._id}`)
        .send({ status: "archived" });

      const res = await agent.get("/api/projects?status=archived");

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe("archived");
    });

    it("should search by title", async () => {
      const { agent } = await registerOrg("Search", "search@test.com");

      await createProject(agent, "Alpha Project");
      await createProject(agent, "Beta Project");
      await createProject(agent, "Alpha Two");

      const res = await agent.get("/api/projects?search=alpha");

      expect(res.body.pagination.total).toBe(2);
    });
  });

  describe("GET /api/projects/:id", () => {
    it("should return single project", async () => {
      const { agent } = await registerOrg("Single", "single@test.com");
      const project = await createProject(agent, "Single Project");

      const res = await agent.get(`/api/projects/${project._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("Single Project");
    });
  });

  describe("PUT /api/projects/:id", () => {
    it("should update project", async () => {
      const { agent } = await registerOrg("Update", "update@test.com");
      const project = await createProject(agent, "Old Title");

      const res = await agent
        .put(`/api/projects/${project._id}`)
        .send({ title: "New Title" });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("New Title");
    });

    it("should not allow viewer to update", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "Viewer Update",
        "vu@test.com"
      );
      const project = await createProject(ownerAgent);
      const { agent: viewerAgent } = await inviteMember(
        ownerAgent,
        "viewer",
        "viewer2@test.com"
      );

      const res = await viewerAgent
        .put(`/api/projects/${project._id}`)
        .send({ title: "Hacked" });

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/projects/:id", () => {
    it("should delete project and cascade tasks", async () => {
      const { agent } = await registerOrg("Delete", "del@test.com");
      const project = await createProject(agent);

      await agent
        .post("/api/tasks")
        .send({ title: "Task", projectId: project._id });

      const deleteRes = await agent
        .delete(`/api/projects/${project._id}`);

      expect(deleteRes.status).toBe(200);

      const tasksRes = await agent
        .get(`/api/tasks?projectId=${project._id}`);

      expect(tasksRes.body.data).toHaveLength(0);
    });

    it("should not allow member to delete", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "Member Del",
        "md@test.com"
      );
      const project = await createProject(ownerAgent);
      const { agent: memberAgent } = await inviteMember(
        ownerAgent,
        "member",
        "member@md.com"
      );

      const res = await memberAgent
        .delete(`/api/projects/${project._id}`);

      expect(res.status).toBe(403);
    });
  });
});

import request from "supertest";
import { app } from "../server.js";
import {
  setupDB,
  registerOrg,
  inviteMember,
  createProject,
  createTask,
} from "../helpers/helper.js";

setupDB();

describe("Tenant Isolation", () => {

  describe("Project Isolation", () => {
    it("tenant A cannot read tenant B project", async () => {
      const { agent: agentA } = await registerOrg("Org A", "a@test.com");
      const { agent: agentB } = await registerOrg("Org B", "b@test.com");

      const projectB = await createProject(agentB, "Secret B");

      const res = await agentA.get(`/api/projects/${projectB._id}`);
      expect(res.status).toBe(404);
    });

    it("tenant A cannot update tenant B project", async () => {
      const { agent: agentA } = await registerOrg("UA", "ua@test.com");
      const { agent: agentB } = await registerOrg("UB", "ub@test.com");

      const projectB = await createProject(agentB);

      const res = await agentA
        .put(`/api/projects/${projectB._id}`)
        .send({ title: "Hacked" });

      expect(res.status).toBe(404);
    });

    it("tenant A cannot delete tenant B project", async () => {
      const { agent: agentA } = await registerOrg("DA", "da@test.com");
      const { agent: agentB } = await registerOrg("DB", "db@test.com");

      const projectB = await createProject(agentB);

      const res = await agentA.delete(`/api/projects/${projectB._id}`);
      expect(res.status).toBe(404);

      // Still exists for B
      const check = await agentB.get(`/api/projects/${projectB._id}`);
      expect(check.status).toBe(200);
    });

    it("project list scoped to tenant", async () => {
      const { agent: agentA } = await registerOrg("List A", "la@test.com");
      const { agent: agentB } = await registerOrg("List B", "lb@test.com");

      await createProject(agentA, "A1");
      await createProject(agentA, "A2");
      await createProject(agentB, "B1");
      await createProject(agentB, "B2");
      await createProject(agentB, "B3");

      const resA = await agentA.get("/api/projects");
      const resB = await agentB.get("/api/projects");

      expect(resA.body.pagination.total).toBe(2);
      expect(resB.body.pagination.total).toBe(3);
    });
  });

  describe("Task Isolation", () => {
    it("tenant A cannot read tenant B task", async () => {
      const { agent: agentA } = await registerOrg("TA", "ta@test.com");
      const { agent: agentB } = await registerOrg("TB", "tb@test.com");

      const projectB = await createProject(agentB);
      const taskB = await createTask(agentB, projectB._id, "Secret Task");

      const res = await agentA.get(`/api/tasks/${taskB._id}`);
      expect(res.status).toBe(404);
    });

    it("tenant A cannot update tenant B task", async () => {
      const { agent: agentA } = await registerOrg("TUA", "tua@test.com");
      const { agent: agentB } = await registerOrg("TUB", "tub@test.com");

      const projectB = await createProject(agentB);
      const taskB = await createTask(agentB, projectB._id);

      const res = await agentA
        .put(`/api/tasks/${taskB._id}`)
        .send({ title: "Hacked" });

      expect(res.status).toBe(404);
    });

    it("tenant A cannot delete tenant B task", async () => {
      const { agent: agentA } = await registerOrg("TDA", "tda@test.com");
      const { agent: agentB } = await registerOrg("TDB", "tdb@test.com");

      const projectB = await createProject(agentB);
      const taskB = await createTask(agentB, projectB._id);

      const res = await agentA.delete(`/api/tasks/${taskB._id}`);
      expect(res.status).toBe(404);
    });

    it("task list scoped to tenant", async () => {
      const { agent: agentA } = await registerOrg("TLA", "tla@test.com");
      const { agent: agentB } = await registerOrg("TLB", "tlb@test.com");

      const projectA = await createProject(agentA);
      const projectB = await createProject(agentB);

      await createTask(agentA, projectA._id, "A Task 1");
      await createTask(agentA, projectA._id, "A Task 2");
      await createTask(agentB, projectB._id, "B Task 1");

      const resA = await agentA.get("/api/tasks");
      expect(resA.body.pagination.total).toBe(2);
    });
  });

  describe("Activity Log Isolation", () => {
    it("tenant A cannot see tenant B activity", async () => {
      const { agent: agentA } = await registerOrg("ActA", "acta@test.com");
      const { agent: agentB } = await registerOrg("ActB", "actb@test.com");

      await createProject(agentB, "B Activity");

      const res = await agentA.get("/api/activity");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("activity shows own org actions", async () => {
      const { agent } = await registerOrg("Own Act", "oa@test.com");

      await createProject(agent, "P1");
      await createProject(agent, "P2");

      const res = await agent.get("/api/activity");

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("RBAC Isolation", () => {
    it("viewer cannot create tasks", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "RBAC1",
        "rbac1@test.com"
      );
      const project = await createProject(ownerAgent);
      const { agent: viewerAgent } = await inviteMember(
        ownerAgent,
        "viewer",
        "v@rbac1.com"
      );

      const res = await viewerAgent
        .post("/api/tasks")
        .send({ title: "Viewer Task", projectId: project._id });

      expect(res.status).toBe(403);
    });

    it("member cannot delete projects", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "RBAC2",
        "rbac2@test.com"
      );
      const project = await createProject(ownerAgent);
      const { agent: memberAgent } = await inviteMember(
        ownerAgent,
        "member",
        "m@rbac2.com"
      );

      const res = await memberAgent
        .delete(`/api/projects/${project._id}`);

      expect(res.status).toBe(403);
    });

    it("member cannot view activity logs", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "RBAC3",
        "rbac3@test.com"
      );
      const { agent: memberAgent } = await inviteMember(
        ownerAgent,
        "member",
        "m@rbac3.com"
      );

      const res = await memberAgent.get("/api/activity");
      expect(res.status).toBe(403);
    });

    it("viewer cannot view activity logs", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "RBAC4",
        "rbac4@test.com"
      );
      const { agent: viewerAgent } = await inviteMember(
        ownerAgent,
        "viewer",
        "v@rbac4.com"
      );

      const res = await viewerAgent.get("/api/activity");
      expect(res.status).toBe(403);
    });

    it("admin can delete projects", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "RBAC5",
        "rbac5@test.com"
      );
      const project = await createProject(ownerAgent);
      const { agent: adminAgent } = await inviteMember(
        ownerAgent,
        "admin",
        "a@rbac5.com"
      );

      const res = await adminAgent
        .delete(`/api/projects/${project._id}`);

      expect(res.status).toBe(200);
    });

    it("admin can view activity logs", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "RBAC6",
        "rbac6@test.com"
      );
      const { agent: adminAgent } = await inviteMember(
        ownerAgent,
        "admin",
        "a@rbac6.com"
      );

      const res = await adminAgent.get("/api/activity");
      expect(res.status).toBe(200);
    });
  });
});

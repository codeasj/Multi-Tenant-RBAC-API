
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

describe("Tasks", () => {

  describe("POST /api/tasks", () => {
    it("should create task", async () => {
      const { agent } = await registerOrg("Task Create", "tc@test.com");
      const project = await createProject(agent);

      const res = await agent
        .post("/api/tasks")
        .send({
          title: "Fix bug",
          projectId: project._id,
          priority: "high",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe("Fix bug");
      expect(res.body.data.priority).toBe("high");
    });

    it("should not create without title", async () => {
      const { agent } = await registerOrg("No Title", "ntt@test.com");
      const project = await createProject(agent);

      const res = await agent
        .post("/api/tasks")
        .send({ projectId: project._id });

      expect(res.status).toBe(400);
    });

    it("should not create without projectId", async () => {
      const { agent } = await registerOrg("No Project", "np@test.com");

      const res = await agent
        .post("/api/tasks")
        .send({ title: "No project task" });

      expect(res.status).toBe(400);
    });

    it("should not allow viewer to create", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "Viewer Task",
        "vt@test.com"
      );
      const project = await createProject(ownerAgent);
      const { agent: viewerAgent } = await inviteMember(
        ownerAgent,
        "viewer",
        "viewer@vt.com"
      );

      const res = await viewerAgent
        .post("/api/tasks")
        .send({ title: "Viewer Task", projectId: project._id });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/tasks", () => {
    it("should return paginated tasks", async () => {
      const { agent } = await registerOrg("Task List", "tl@test.com");
      const project = await createProject(agent);

      await createTask(agent, project._id, "Task 1");
      await createTask(agent, project._id, "Task 2");
      await createTask(agent, project._id, "Task 3");

      const res = await agent
        .get(`/api/tasks?projectId=${project._id}&limit=2`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(3);
    });

    it("should filter by status", async () => {
      const { agent } = await registerOrg("Task Status", "ts@test.com");
      const project = await createProject(agent);

      const task = await createTask(agent, project._id, "In Progress");

      await agent
        .put(`/api/tasks/${task._id}`)
        .send({ status: "in_progress" });

      await createTask(agent, project._id, "Todo Task");

      const res = await agent.get("/api/tasks?status=in_progress");

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe("in_progress");
    });

    it("should filter by priority", async () => {
      const { agent } = await registerOrg("Priority", "pri@test.com");
      const project = await createProject(agent);

      await agent
        .post("/api/tasks")
        .send({ title: "High Task", projectId: project._id, priority: "high" });

      await agent
        .post("/api/tasks")
        .send({ title: "Low Task", projectId: project._id, priority: "low" });

      const res = await agent.get("/api/tasks?priority=high");

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].priority).toBe("high");
    });
  });

  describe("PUT /api/tasks/:id", () => {
    it("should update task status", async () => {
      const { agent } = await registerOrg("Update Task", "ut@test.com");
      const project = await createProject(agent);
      const task = await createTask(agent, project._id);

      const res = await agent
        .put(`/api/tasks/${task._id}`)
        .send({ status: "done" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("done");
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should delete task", async () => {
      const { agent } = await registerOrg("Delete Task", "dt@test.com");
      const project = await createProject(agent);
      const task = await createTask(agent, project._id);

      const deleteRes = await agent.delete(`/api/tasks/${task._id}`);
      expect(deleteRes.status).toBe(200);

      const getRes = await agent.get(`/api/tasks/${task._id}`);
      expect(getRes.status).toBe(404);
    });

    it("should not allow member to delete", async () => {
      const { agent: ownerAgent } = await registerOrg(
        "Member Delete",
        "mdt@test.com"
      );
      const project = await createProject(ownerAgent);
      const task = await createTask(ownerAgent, project._id);
      const { agent: memberAgent } = await inviteMember(
        ownerAgent,
        "member",
        "member@mdt.com"
      );

      const res = await memberAgent.delete(`/api/tasks/${task._id}`);
      expect(res.status).toBe(403);
    });
  });
});

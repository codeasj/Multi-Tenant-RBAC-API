
import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { app } from "../server.js";

dotenv.config();

export const setupDB = () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });
};

// Each user gets their own agent - stores cookies automatically
export const registerOrg = async (
  orgName = "Test Org",
  email = "owner@test.com"
) => {
  const agent = request.agent(app); // own session per user

  const res = await agent
    .post("/api/auth/register-org")
    .send({
      orgName,
      name: "Test Owner",
      email,
      password: "password123",
    });

  return {
    agent,                          //return agent, not cookie
    userId: res.body.user?.id,
    organizationId: res.body.organization?.id,
    role: res.body.user?.role,
    status: res.status,
    body: res.body,
  };
};

export const inviteMember = async (
  ownerAgent,
  role = "member",
  email = "member@test.com"
) => {
  await ownerAgent
    .post("/api/auth/invite")
    .send({
      name: "Test Member",
      email,
      password: "password123",
      role,
    });

  // New agent for invited member
  const memberAgent = request.agent(app);

  const loginRes = await memberAgent
    .post("/api/auth/login")
    .send({ email, password: "password123" });

  return {
    agent: memberAgent,             // ← own agent with session
    userId: loginRes.body.user?.id,
    role: loginRes.body.user?.role,
  };
};

export const createProject = async (agent, title = "Test Project") => {
  const res = await agent
    .post("/api/projects")
    .send({ title, description: "Test description" });

  return res.body.data;
};

export const createTask = async (agent, projectId, title = "Test Task") => {
  const res = await agent
    .post("/api/tasks")
    .send({ title, projectId, priority: "medium" });

  return res.body.data;
};
import api from "./api";

const newsService = {
  getAll: async () => {
    const res = await api.get("/news");
    return res.data; 
  },

  getById: async (id) => {
    const res = await api.get(`/news/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post("/news", data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/news/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/news/${id}`);
    return res.data;
  },
};

export default newsService;
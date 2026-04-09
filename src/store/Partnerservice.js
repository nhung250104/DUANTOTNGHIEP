import api from "./api";

const PartnerService = {
  getAll:    ()         => api.get("/partners"),
  getById:   (id)       => api.get(`/partners/${id}`),
  create:    (data)     => api.post("/partners", data),
  update:    (id, data) => api.put(`/partners/${id}`, data),
  delete:    (id)       => api.delete(`/partners/${id}`),
};

export default PartnerService;
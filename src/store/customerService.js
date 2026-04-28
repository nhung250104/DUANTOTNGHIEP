/**
 * src/store/customerService.js
 *
 * Service mỏng cho collection /customers.
 * Tách hàm để page user và admin dùng chung, thuận tiện viết test sau này.
 */

import api from "./api";

const COLLECTION = "/customers";

const customerService = {
  /** Lấy tất cả KH (admin). */
  getAll: () => api.get(COLLECTION),

  /** Lấy KH của 1 user — dùng query json-server. */
  getByUserId: (userId) => api.get(`${COLLECTION}?userId=${userId}`),

  /** Lấy 1 KH theo id. */
  getById: (id) => api.get(`${COLLECTION}/${id}`),

  /** Tạo mới — id sẽ được tự cấp ở client để giữ nhất quán với các collection khác. */
  create: (data) => api.post(COLLECTION, data),

  /** Cập nhật — PUT toàn bộ object để khớp json-server. */
  update: (id, data) => api.put(`${COLLECTION}/${id}`, data),

  /** Xoá. */
  remove: (id) => api.delete(`${COLLECTION}/${id}`),
};

export default customerService;

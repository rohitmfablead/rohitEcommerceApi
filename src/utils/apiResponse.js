export default (res, data, status = 200) => {
  res.status(status).json(data);
};

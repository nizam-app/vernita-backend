export default class ApiResponse {
  static success(
    res,
    {
      statusCode = 200,
      status = "success",
      message = "OK",
      data = null,
      meta = null,
    } = {}
  ) {
    const payload = { status, message };

    if (meta) payload.meta = meta;
    if (data !== null) payload.data = data;

    return res.status(statusCode).json(payload);
  }
}

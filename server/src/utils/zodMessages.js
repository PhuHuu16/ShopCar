// -- Thông báo lỗi kiểm tra dữ liệu bằng tiếng Việt --
const { z } = require('zod');

z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') return { message: 'Thông tin này là bắt buộc' };
      if (issue.expected === 'number' && issue.received === 'nan') return { message: 'Hãy nhập một con số' };
      return { message: 'Giá trị không hợp lệ' };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: 'Giá trị không nằm trong danh sách cho phép' };
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') return { message: `Tối thiểu ${issue.minimum} ký tự` };
      if (issue.type === 'array') return { message: `Cần ít nhất ${issue.minimum} mục` };
      return { message: `Giá trị tối thiểu là ${issue.minimum}` };
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `Tối đa ${issue.maximum} ký tự` };
      if (issue.type === 'array') return { message: `Tối đa ${issue.maximum} mục` };
      return { message: `Giá trị tối đa là ${issue.maximum}` };
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'Email không hợp lệ' };
      return { message: 'Định dạng không hợp lệ' };
    default:
      return { message: ctx.defaultError };
  }
});

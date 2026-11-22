import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import {
  COURSE_ACCESS_TYPES,
  COURSE_LEVELS,
  COURSE_STATUSES,
} from "./course.model.js";
import { LESSON_CONTENT_TYPES, LESSON_RESOURCE_TYPES, QUIZ_QUESTION_TYPES } from "./lesson.model.js";

const ensureMongoId = (value, fieldName) => {
  if (!value || typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid id.`);
  }
};

const ensureString = (value, fieldName, required = false) => {
  if (value === undefined && !required) return;
  if (typeof value !== "string" || (required && !value.trim())) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a non-empty string.`);
  }
};

const ensureBoolean = (value, fieldName) => {
  if (typeof value !== "boolean") {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a boolean.`);
  }
};

const ensureNonNegativeNumber = (value, fieldName, required = false) => {
  if (value === undefined && !required) return;
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${fieldName} must be a valid non-negative number.`
    );
  }
};

const ensureEnum = (value, fieldName, allowed, required = false) => {
  if (value === undefined && !required) return;
  if (!allowed.includes(value)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${fieldName} must be one of: ${allowed.join(", ")}.`
    );
  }
};

const ensureStringArray = (value, fieldName) => {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be an array.`);
  }
  if (value.some((item) => typeof item !== "string")) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must contain strings only.`);
  }
};

const ensureResourceArray = (resources) => {
  if (resources === undefined) return;
  if (!Array.isArray(resources)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "resources must be an array.");
  }

  for (const resource of resources) {
    if (!resource || typeof resource !== "object" || Array.isArray(resource)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Each resource must be an object.");
    }
    ensureString(resource.title, "resource.title", true);
    ensureEnum(resource.type, "resource.type", LESSON_RESOURCE_TYPES, true);
    ensureString(resource.url, "resource.url", true);
  }
};

const ensurePositiveIntegerQuery = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a positive integer.`);
  }
  return parsed;
};

const questionTypeOf = (question) =>
  QUIZ_QUESTION_TYPES.includes(question?.type) ? question.type : "single";

const ensureQuestionChoices = (question) => {
  if (!Array.isArray(question.choices) || question.choices.length < 2) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Each question needs at least two choices.");
  }
  if (question.choices.length > 8) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Each question can have at most 8 choices.");
  }

  let correctCount = 0;
  for (const choice of question.choices) {
    if (!choice || typeof choice !== "object" || Array.isArray(choice)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Each choice must be an object.");
    }
    ensureString(choice.text, "choice.text", true);
    if (typeof choice.isCorrect !== "boolean") {
      throw new ApiError(httpStatus.BAD_REQUEST, "choice.isCorrect must be a boolean.");
    }
    if (choice.isCorrect) correctCount += 1;
  }
  return correctCount;
};

const ensureQuestions = (questions, required = false, { survey = false } = {}) => {
  if (questions === undefined && !required) return;
  if (!required && Array.isArray(questions) && questions.length === 0) return;
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Quiz lessons need at least one question.");
  }
  if (questions.length > 50) {
    throw new ApiError(httpStatus.BAD_REQUEST, "A quiz can have at most 50 questions.");
  }

  for (const question of questions) {
    if (!question || typeof question !== "object" || Array.isArray(question)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Each question must be an object.");
    }
    ensureString(question.prompt, "question.prompt", true);
    if (question.type !== undefined) {
      ensureEnum(question.type, "question.type", QUIZ_QUESTION_TYPES, true);
    }
    const type = questionTypeOf(question);
    if (question.optional !== undefined) ensureBoolean(question.optional, "question.optional");
    if (type === "rating" || type === "scale" || type === "text") continue;

    if (survey) {
      if (!Array.isArray(question.choices) || question.choices.length < 2 || question.choices.length > 8) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Each choice question needs 2 to 8 choices.");
      }
      for (const choice of question.choices) {
        if (!choice || typeof choice !== "object" || Array.isArray(choice)) {
          throw new ApiError(httpStatus.BAD_REQUEST, "Each choice must be an object.");
        }
        ensureString(choice.text, "choice.text", true);
      }
      continue;
    }

    const correctCount = ensureQuestionChoices(question);
    if (type === "multiple") {
      if (correctCount < 1) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Each multiple-answer question needs at least one correct choice.");
      }
      continue;
    }
    if (correctCount !== 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Each one-answer question must have exactly one correct choice.");
    }
  }
};

const ensurePassingGradeFields = (body) => {
  if (body.requirePassingGrade !== undefined) ensureBoolean(body.requirePassingGrade, "requirePassingGrade");
  if (body.passingGrade !== undefined) {
    if (!Number.isInteger(body.passingGrade) || body.passingGrade < 0 || body.passingGrade > 100) {
      throw new ApiError(httpStatus.BAD_REQUEST, "passingGrade must be an integer from 0 to 100.");
    }
  }
};

export const validateCourseIdParam = (id) => ensureMongoId(id, "courseId");
export const validateEnrollmentIdParam = (id) => ensureMongoId(id, "enrollmentId");
export const validateLessonIdParam = (id) => ensureMongoId(id, "lessonId");
export const validateChapterIdParam = (id) => ensureMongoId(id, "chapterId");

export const validateCreateCourse = (body, { partial = false } = {}) => {
  ensureString(body.title, "title", true);
  ensureString(body.instructorName, "instructorName", true);
  ensureString(body.description, "description");
  if (partial) ensureString(body.bannerImage, "bannerImage");
  else ensureString(body.bannerImage, "bannerImage", true);
  ensureString(body.category, "category");
  ensureStringArray(body.tags, "tags");
  ensureString(body.instructorTitle, "instructorTitle");
  ensureString(body.instructorBio, "instructorBio");
  ensureEnum(body.level, "level", COURSE_LEVELS);
  ensureString(body.durationText, "durationText");
  ensureNonNegativeNumber(body.durationInWeeks, "durationInWeeks");
  ensureBoolean(body.certificateEnabled ?? false, "certificateEnabled");
  ensureEnum(body.accessType, "accessType", COURSE_ACCESS_TYPES);
  ensureNonNegativeNumber(body.price, "price");
  ensureString(body.currency, "currency");
  if (body.isFeatured !== undefined) ensureBoolean(body.isFeatured, "isFeatured");
  if (body.isPublished !== undefined) ensureBoolean(body.isPublished, "isPublished");
  ensureEnum(body.status, "status", COURSE_STATUSES);
};

export const validateUpdateCourse = (body) => {
  const allowedFields = [
    "title",
    "description",
    "bannerImage",
    "bannerImagePublicId",
    "category",
    "tags",
    "instructorName",
    "instructorTitle",
    "instructorBio",
    "level",
    "durationText",
    "durationInWeeks",
    "rating",
    "reviewsCount",
    "certificateEnabled",
    "accessType",
    "price",
    "currency",
    "isFeatured",
    "isPublished",
    "status",
  ];
  const keys = Object.keys(body || {});
  if (keys.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "At least one field is required.");
  }
  const invalidFields = keys.filter((key) => !allowedFields.includes(key));
  if (invalidFields.length > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid update fields: ${invalidFields.join(", ")}.`
    );
  }

  validateCreateCourse({ ...body, title: body.title ?? "placeholder", instructorName: body.instructorName ?? "placeholder" }, { partial: true });
};

export const validateToggleBody = (body, fieldName) => {
  if (body?.[fieldName] === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} is required.`);
  }
  ensureBoolean(body[fieldName], fieldName);
};

export const validateCreateLesson = (body) => {
  const contentType = body.contentType || "video";
  ensureEnum(contentType, "contentType", LESSON_CONTENT_TYPES, true);
  body.contentType = contentType;
  ensureMongoId(body.chapterId, "chapterId");
  ensureString(body.title, "title", true);
  ensureString(body.summary, "summary");
  ensureString(body.body, "body", contentType === "text");
  if (contentType === "video") ensureString(body.videoUrl, "videoUrl", true);
  else if (body.videoUrl !== undefined) ensureString(body.videoUrl, "videoUrl");
  ensureString(body.videoDurationText, "videoDurationText");
  ensureNonNegativeNumber(body.videoDurationSeconds, "videoDurationSeconds");
  if (body.sortOrder !== undefined) {
    ensureNonNegativeNumber(body.sortOrder, "sortOrder", true);
    if (!Number.isInteger(body.sortOrder)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "sortOrder must be an integer.");
    }
  }
  if (body.isPreview !== undefined) ensureBoolean(body.isPreview, "isPreview");
  if (body.isPrerequisite !== undefined) ensureBoolean(body.isPrerequisite, "isPrerequisite");
  if (body.isPublished !== undefined) ensureBoolean(body.isPublished, "isPublished");
  ensurePassingGradeFields(body);
  ensureResourceArray(body.resources);
  if (contentType === "quiz" || contentType === "survey") {
    ensureQuestions(body.questions, true, { survey: contentType === "survey" });
  } else if (body.questions !== undefined) ensureQuestions(body.questions, false);
};

export const validateUpdateLesson = (body) => {
  const allowedFields = [
    "chapterId",
    "contentType",
    "title",
    "summary",
    "body",
    "videoUrl",
    "videoDurationText",
    "videoDurationSeconds",
    "resources",
    "questions",
    "sortOrder",
    "isPreview",
    "isPrerequisite",
    "isPublished",
    "requirePassingGrade",
    "passingGrade",
  ];
  const keys = Object.keys(body || {});
  if (keys.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "At least one field is required.");
  }
  const invalidFields = keys.filter((key) => !allowedFields.includes(key));
  if (invalidFields.length > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid update fields: ${invalidFields.join(", ")}.`
    );
  }
  if (body.chapterId !== undefined) ensureMongoId(body.chapterId, "chapterId");
  if (body.contentType !== undefined) ensureEnum(body.contentType, "contentType", LESSON_CONTENT_TYPES, true);
  if (body.title !== undefined) ensureString(body.title, "title", true);
  ensureString(body.summary, "summary");
  ensureString(body.body, "body");
  ensureString(body.videoUrl, "videoUrl");
  ensureString(body.videoDurationText, "videoDurationText");
  ensureNonNegativeNumber(body.videoDurationSeconds, "videoDurationSeconds");
  if (body.sortOrder !== undefined && !Number.isInteger(body.sortOrder)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "sortOrder must be an integer.");
  }
  if (body.isPreview !== undefined) ensureBoolean(body.isPreview, "isPreview");
  if (body.isPrerequisite !== undefined) ensureBoolean(body.isPrerequisite, "isPrerequisite");
  if (body.isPublished !== undefined) ensureBoolean(body.isPublished, "isPublished");
  ensurePassingGradeFields(body);
  ensureResourceArray(body.resources);
  if (body.contentType === "quiz" || body.contentType === "survey" || body.questions !== undefined) {
    if (body.contentType === "quiz" || body.contentType === "survey" || (Array.isArray(body.questions) && body.questions.length > 0)) {
      ensureQuestions(body.questions, body.contentType === "quiz" || body.contentType === "survey", {
        survey: body.contentType === "survey",
      });
    }
  }
};

export const validateReorderLessons = (body) => {
  if (!Array.isArray(body?.lessons) || body.lessons.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "lessons must be a non-empty array.");
  }
  for (const lesson of body.lessons) {
    ensureMongoId(lesson.id, "lesson.id");
    if (lesson.chapterId !== undefined) ensureMongoId(lesson.chapterId, "lesson.chapterId");
    if (!Number.isInteger(lesson.sortOrder) || lesson.sortOrder < 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "lesson.sortOrder must be a non-negative integer.");
    }
  }
};

export const validateCreateChapter = (body) => {
  ensureString(body?.title, "title", true);
};

export const validateUpdateChapter = (body) => {
  ensureString(body?.title, "title", true);
};

export const validateReorderChapters = (body) => {
  if (!Array.isArray(body?.chapters) || body.chapters.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "chapters must be a non-empty array.");
  }
  for (const chapter of body.chapters) {
    ensureMongoId(chapter.id, "chapter.id");
    if (!Number.isInteger(chapter.sortOrder) || chapter.sortOrder < 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "chapter.sortOrder must be a non-negative integer.");
    }
  }
};

export const validateQuizSubmit = (body) => {
  if (!Array.isArray(body?.answers)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "answers must be an array.");
  }
  for (const answer of body.answers) {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Each answer must be an object.");
    }
    ensureMongoId(String(answer.questionId || ""), "answer.questionId");
    if (answer.choiceId !== undefined && answer.choiceId !== null && answer.choiceId !== "") {
      ensureMongoId(String(answer.choiceId), "answer.choiceId");
    }
    if (answer.choiceIds !== undefined) {
      if (!Array.isArray(answer.choiceIds) || answer.choiceIds.length > 8) {
        throw new ApiError(httpStatus.BAD_REQUEST, "answer.choiceIds must be an array of at most 8 ids.");
      }
      for (const choiceId of answer.choiceIds) {
        ensureMongoId(String(choiceId || ""), "answer.choiceId");
      }
    }
    if (answer.text !== undefined && answer.text !== null) {
      if (typeof answer.text !== "string" || answer.text.length > 2000) {
        throw new ApiError(httpStatus.BAD_REQUEST, "answer.text must be 2000 characters or fewer.");
      }
    }
    if (answer.value !== undefined && answer.value !== null) {
      if (!Number.isInteger(answer.value)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "answer.value must be an integer.");
      }
    }
  }
};

export const validateCourseListQuery = (query, { admin = false } = {}) => {
  const normalized = {};

  if (query.category !== undefined) normalized.category = String(query.category).trim();
  if (query.accessType !== undefined) {
    ensureEnum(String(query.accessType), "accessType", COURSE_ACCESS_TYPES, true);
    normalized.accessType = String(query.accessType);
  }
  if (query.level !== undefined) {
    ensureEnum(String(query.level), "level", COURSE_LEVELS, true);
    normalized.level = String(query.level);
  }
  if (query.search !== undefined) normalized.search = String(query.search).trim();
  if (admin && query.status !== undefined) {
    ensureEnum(String(query.status), "status", COURSE_STATUSES, true);
    normalized.status = String(query.status);
  }
  for (const key of ["isPublished", "isFeatured", "featured", "freeOnly"]) {
    if (query[key] !== undefined) {
      if (!["true", "false"].includes(String(query[key]))) {
        throw new ApiError(httpStatus.BAD_REQUEST, `${key} must be true or false.`);
      }
      normalized[key] = String(query[key]) === "true";
    }
  }

  normalized.page = query.page ? ensurePositiveIntegerQuery(query.page, "page") : 1;
  normalized.limit = query.limit ? ensurePositiveIntegerQuery(query.limit, "limit") : 10;
  if (normalized.limit > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, "limit cannot be greater than 100.");
  }

  const allowedSortFields = [
    "createdAt",
    "title",
    "price",
    "rating",
    "studentCount",
    "lessonsCount",
  ];
  normalized.sortBy = query.sortBy ? String(query.sortBy).trim() : "createdAt";
  if (!allowedSortFields.includes(normalized.sortBy)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `sortBy must be one of: ${allowedSortFields.join(", ")}.`
    );
  }

  const sortOrder = query.sortOrder ? String(query.sortOrder).trim().toLowerCase() : "desc";
  if (!["asc", "desc", "1", "-1"].includes(sortOrder)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "sortOrder must be asc, desc, 1, or -1.");
  }
  normalized.sortOrder = sortOrder === "asc" || sortOrder === "1" ? 1 : -1;

  return normalized;
};

export const validateEnrollRequest = () => true;

export const validateLessonProgress = (body) => {
  ensureNonNegativeNumber(body.watchedSeconds, "watchedSeconds", true);
};

export const validateLessonComplete = () => true;

export const validatePaymentCompletion = (body) => {
  const normalized = {};

  if (body?.paymentReference !== undefined) {
    ensureString(body.paymentReference, "paymentReference", true);
    normalized.paymentReference = body.paymentReference.trim();
  }

  if (body?.paymentProvider !== undefined) {
    ensureString(body.paymentProvider, "paymentProvider", true);
    normalized.paymentProvider = body.paymentProvider.trim();
  }

  return normalized;
};

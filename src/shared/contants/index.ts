export const DB_NAME_DEFAULT = "chaogu";

export const COLLECTIONS = {
  JINGJIA: "jingjia",
  YIDONG: "yidong",
} as const;

export const COLLECTION_OPTIONS = [
  { label: COLLECTIONS.JINGJIA, value: COLLECTIONS.JINGJIA },
  { label: COLLECTIONS.YIDONG, value: COLLECTIONS.YIDONG },
] as const;

export const ALLOWED_COLLECTIONS = new Set<string>(
  COLLECTION_OPTIONS.map((option) => option.value)
);

export const DATE_FORMAT = "YYYY-MM-DD";
export const CREATE_TIME_SUFFIX = "12:00:00";

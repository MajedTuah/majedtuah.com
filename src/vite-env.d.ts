/// <reference types="vite/client" />

/*
 * VITE_* variables are copied INTO the public JavaScript at build time, so only put public
 * configuration here, never a secret (decision D-011 in docs/decisions.md).
 */
interface ImportMetaEnv {
  /** Hugging Face repo holding the opt-in teacher model, e.g. "MajedTuah/braindump-teacher-onnx". Unset = teacher button hidden. */
  readonly VITE_TEACHER_REPO?: string
}

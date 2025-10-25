// index.d.ts

declare module "@turbowarp/packager" {
  /**
   * Progress callback invoked during project loading.
   * @param type A progress “type” string (e.g. "assets", "compress", etc.)
   * @param a First numeric argument (meaning depends on type)
   * @param b Second numeric argument (meaning depends on type)
   */
  type ProgressCallback = (type: string, a: number, b: number) => void;

  /**
   * The “loaded project” object returned by `loadProject`.
   * It's an opaque object whose internal structure is not fully documented.
   */
  interface LoadedProject {
    // You may extend with more known properties if discovered.
    // For now treat as an opaque object.
    [key: string]: unknown;
  }

  /**
   * Options for packaging. This corresponds to `packager.options` in the implementation.
   */
  interface PackagerOptions {
    // Many options exist; here are some known ones (expand as needed):
    turbo?: boolean;
    custom?: {
      js?: string;
      css?: string;
    };
    app?: {
      icon?: Image;
      // Possibly other fields for app configuration (e.g. name, version, etc.)
      [key: string]: unknown;
    };
    // Add other options fields as you discover them
    [key: string]: unknown;
  }

  /**
   * Class representing an image used in packaging (e.g. icon images).
   */
  class Image {
    constructor(mimeType: string, data: ArrayBuffer | Uint8Array | Buffer);
    mimeType: string;
    data: Uint8Array;
  }

  interface PackageResult {
    /** Suggested filename (with extension) for the packaged project. */
    filename: string;
    /** MIME type of the output (e.g. "text/html" or "application/zip") */
    type: string;
    /** The packaged data as a Uint8Array. */
    data: Uint8Array;
  }

  /**
   * The main Packager class. You create an instance, set its `.project` to a loaded project,
   * tweak its `.options`, then call `.package()`.
   */
  class Packager {
    constructor();

    /** The loaded project to package (must be set before calling `package()`). */
    project: LoadedProject;

    /** Options for how the packaging should be done. */
    options: PackagerOptions;

    /**
     * Package the set project with the current options.
     * @returns A promise resolving to a PackageResult.
     */
    package(): Promise<PackageResult>;

    /**
     * Add an event listener for progress or other custom events.
     * The class implements a minimal event-like API (not a full EventTarget).
     *
     * Known events include:
     *  - 'zip-progress'
     *  - 'large-asset-fetch'
     *
     * @param eventName Name of the event
     * @param listener A callback receiving an event object with `.detail`
     */
    addEventListener(
      eventName: string,
      listener: (ev: { detail: any }) => void,
    ): void;
  }

  /**
   * Load a project into an internal representation for packaging.
   * @param projectData Raw project data (ArrayBuffer, Uint8Array, or Buffer)
   * @param progressCallback Optional callback for reporting progress during loading
   * @returns A promise resolving to a LoadedProject
   */
  function loadProject(
    projectData: ArrayBuffer | Uint8Array | Buffer,
    progressCallback?: ProgressCallback,
  ): Promise<LoadedProject>;

  // Default export is the class or object with loadProject, etc.
  const PackagerModule: {
    loadProject: typeof loadProject;
    Packager: typeof Packager;
    Image: typeof Image;
  };

  export = PackagerModule;
}

declare module "@prisma/nextjs-monorepo-workaround-plugin" {
  export class PrismaPlugin {}
}

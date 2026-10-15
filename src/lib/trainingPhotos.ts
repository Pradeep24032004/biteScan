// Saves photos of dishes the user scanned and then logged, labelled with what they actually ate.
// They stay on the phone (Documents/training/<label>/) and are copied off over USB for retraining:
//   xcrun devicectl device copy from --device <UDID> --domain-type appDataContainer \
//     --domain-identifier com.mpradeep.bitescan --source Documents/training --destination ml/data/phone
import { Directory, File, Paths } from 'expo-file-system';

import type { Food } from '@/data/foods';

const ROOT = 'training';

/** Built-in dishes use their food id; "My foods" use a slug of the name so the folder is readable. */
export function trainingLabel(food: Food): string {
  if (food.category !== 'My Foods') return food.id;
  return `custom_${food.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}

export function saveTrainingPhoto(photoUri: string, food: Food) {
  try {
    const dir = new Directory(Paths.document, ROOT, trainingLabel(food));
    dir.create({ intermediates: true, idempotent: true });
    new File(photoUri).copy(new File(dir, `${Date.now()}.jpg`));
  } catch {
    // Never block logging food because a photo couldn't be saved.
  }
}

export function countTrainingPhotos(): { photos: number; dishes: number } {
  try {
    const root = new Directory(Paths.document, ROOT);
    if (!root.exists) return { photos: 0, dishes: 0 };
    let photos = 0;
    let dishes = 0;
    for (const entry of root.list()) {
      if (entry instanceof Directory) {
        const n = entry.list().filter((f) => f instanceof File).length;
        if (n > 0) dishes++;
        photos += n;
      }
    }
    return { photos, dishes };
  } catch {
    return { photos: 0, dishes: 0 };
  }
}

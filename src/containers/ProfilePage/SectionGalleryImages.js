import React from 'react';
import classNames from 'classnames';
import { Heading } from '../../components';
import css from './ProfilePage.module.css';

const SectionGalleryImages = props => {
  const { images } = props;
  if (!images || images.length === 0) {
    return null;
  }
  return (
    <section className={classNames(css.sectionGallery)}>
      <Heading as="h2" rootClassName={css.sectionHeading}>
        Gallery
      </Heading>
      <ul className={css.galleryImagesList}>
        {images.map(img => (
          <li key={img.id} className={css.galleryImageWrapper}>
            <img src={img.attributes.variants['square-small'].url} alt='' className={css.galleryImage} />
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SectionGalleryImages;

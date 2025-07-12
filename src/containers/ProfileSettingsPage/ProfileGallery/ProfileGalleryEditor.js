import React from 'react';
import classNames from 'classnames';
import { Field } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import { Form as FinalForm, FieldArray } from 'react-final-form-arrays';

import { FormattedMessage } from '../../../util/reactIntl';
import { ImageFromFile, AspectRatioWrapper, IconSpinner, Button } from '../../../components';

import css from './ProfileGalleryEditor.module.css';

const ACCEPT_IMAGES = 'image/*';

const FieldAddImage = props => {
  const { formApi, onImageUploadHandler, ...rest } = props;
  return (
    <Field form={null} {...rest}>
      {fieldProps => {
        const { accept, input, label } = fieldProps;
        const { name, type } = input;
        const onChange = e => {
          const file = e.target.files[0];
          formApi.change('addImage', file);
          formApi.blur('addImage');
          if (file) {
            onImageUploadHandler(file);
          }
        };
        const inputProps = { accept, id: name, name, onChange, type };
        return (
          <div className={css.addImageWrapper}>
            <AspectRatioWrapper width={1} height={1}>
              <input {...inputProps} className={css.addImageInput} />
              <label htmlFor={name} className={css.addImage}>
                {label}
              </label>
            </AspectRatioWrapper>
          </div>
        );
      }}
    </Field>
  );
};

const GalleryImage = props => {
  const { image, onRemoveImage } = props;
  if (image.file && !image.uploadedImage) {
    return (
      <ImageFromFile
        id={image.id}
        className={css.thumbnail}
        file={image.file}
        aspectWidth={1}
        aspectHeight={1}
      >
        <div className={css.thumbnailLoading}>
          <IconSpinner />
        </div>
      </ImageFromFile>
    );
  }
  const img = image.uploadedImage || image;
  const variants = img.attributes ? Object.keys(img.attributes.variants) : [];
  const imgForResponsive = { ...img, id: img.id };
  return (
    <div className={css.thumbnailWrapper}>
      <AspectRatioWrapper width={1} height={1}>
        <img className={css.thumbnailImg} src={imgForResponsive.attributes.variants['square-small'].url} alt='' />
      </AspectRatioWrapper>
      <button className={css.removeButton} type='button' onClick={() => onRemoveImage(image.id)}>
        ×
      </button>
    </div>
  );
};

const ProfileGalleryEditor = props => {
  const { className, images, onImageUpload, onRemoveImage, uploadInProgress, uploadError } = props;

  const onImageUploadHandler = file => {
    onImageUpload({ id: `${file.name}_${Date.now()}`, file });
  };

  return (
    <FinalForm
      mutators={{ ...arrayMutators }}
      initialValues={{ images }}
      render={formRenderProps => {
        const { handleSubmit, form, values } = formRenderProps;
        const imgs = values.images || [];
        return (
          <form onSubmit={handleSubmit} className={classNames(css.root, className)}>
            <div className={css.imagesFieldArray}>
              <FieldArray name='images'>
                {({ fields }) =>
                  fields.map((name, index) => (
                    <Field name={name} key={name}>
                      {({ input }) => (
                        <GalleryImage image={input.value} onRemoveImage={id => fields.remove(index) || onRemoveImage(id)} />
                      )}
                    </Field>
                  ))
                }
              </FieldArray>
              <FieldAddImage
                id='addImage'
                name='addImage'
                accept={ACCEPT_IMAGES}
                label={<FormattedMessage id='ProfileGalleryEditor.addImage' />}
                type='file'
                formApi={form}
                onImageUploadHandler={onImageUploadHandler}
              />
            </div>
            {uploadError ? <div className={css.error}><FormattedMessage id='ProfileGalleryEditor.uploadFailed' /></div> : null}
            <Button className={css.hiddenSubmit} type='submit' disabled />
          </form>
        );
      }}
    />
  );
};

export default ProfileGalleryEditor;

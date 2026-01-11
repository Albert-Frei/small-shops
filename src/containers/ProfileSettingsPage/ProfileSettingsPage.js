import React, { useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { PROFILE_PAGE_PENDING_APPROVAL_VARIANT } from '../../util/urlHelpers';
import { ensureCurrentUser } from '../../util/data';
import {
  initialValuesForUserFields,
  isUserAuthorized,
  pickUserFieldsData,
} from '../../util/userHelpers';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { H3, Page, UserNav, NamedLink, LayoutSingleColumn } from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import ProfileSettingsForm from './ProfileSettingsForm/ProfileSettingsForm';
import ProfileGalleryEditor from './ProfileGallery/ProfileGalleryEditor';

import {
  updateProfile,
  uploadImage,
  uploadGalleryImage,
  removeGalleryImage,
  loadGalleryImages,
} from './ProfileSettingsPage.duck';
import css from './ProfileSettingsPage.module.css';

const onImageUploadHandler = (values, fn) => {
  const { id, imageId, file } = values;
  if (file) {
    fn({ id, imageId, file });
  }
};

const ViewProfileLink = props => {
  const { userUUID, isUnauthorizedUser } = props;
  return userUUID && isUnauthorizedUser ? (
    <NamedLink
      className={css.profileLink}
      name="ProfilePageVariant"
      params={{ id: userUUID, variant: PROFILE_PAGE_PENDING_APPROVAL_VARIANT }}
    >
      <FormattedMessage id="ProfileSettingsPage.viewProfileLink" />
    </NamedLink>
  ) : userUUID ? (
    <NamedLink className={css.profileLink} name="ProfilePage" params={{ id: userUUID }}>
      <FormattedMessage id="ProfileSettingsPage.viewProfileLink" />
    </NamedLink>
  ) : null;
};

/**
 * ProfileSettingsPage
 *
 * @component
 * @param {Object} props
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {Object} props.image - The image
 * @param {string} props.image.id - The image id
 * @param {propTypes.uuid} props.image.imageId - The image id
 * @param {File} props.image.file - The image file
 * @param {propTypes.image} props.image.uploadedImage - The uploaded image
 * @param {Function} props.onImageUpload - The image upload function
 * @param {Function} props.onUpdateProfile - The update profile function
 * @param {boolean} props.scrollingDisabled - Whether the scrolling is disabled
 * @param {boolean} props.updateInProgress - Whether the update is in progress
 * @param {propTypes.error} props.updateProfileError - The update profile error
 * @param {propTypes.error} props.uploadImageError - The upload image error
 * @param {boolean} props.uploadInProgress - Whether the upload is in progress
 * @returns {JSX.Element}
 */
export const ProfileSettingsPageComponent = props => {
  const config = useConfiguration();
  const intl = useIntl();
  const {
    currentUser,
    image,
    galleryImages,
    storedGalleryImages,
    onImageUpload,
    onGalleryImageUpload,
    onRemoveGalleryImage,
    onLoadGalleryImages,
    onUpdateProfile,
    scrollingDisabled,
    updateInProgress,
    updateProfileError,
    uploadImageError,
    uploadInProgress,
    uploadGalleryInProgress,
    uploadGalleryImageError,
  } = props;

  // Load gallery images from metadata on mount if we have stored images but none loaded
  useEffect(() => {
    if (storedGalleryImages.length > 0 && galleryImages.length === 0) {
      onLoadGalleryImages(storedGalleryImages);
    }
  }, [storedGalleryImages, galleryImages.length, onLoadGalleryImages]);

  const { userFields, userTypes = [] } = config.user;

  const handleSubmit = (values, userType) => {
    const { firstName, lastName, displayName, bio: rawBio, ...rest } = values;

    const displayNameMaybe = displayName
      ? { displayName: displayName.trim() }
      : { displayName: null };

    // Ensure that the optional bio is a string
    const bio = rawBio || '';

    // Extract serializable image data for storage in metadata
    const profileGalleryImages = galleryImages.map(img => {
      const imgData = img.uploadedImage || img;
      const id = imgData.id?.uuid || imgData.id;
      const variants = imgData.attributes?.variants || {};
      return {
        id: typeof id === 'string' ? id : id?.uuid,
        attributes: { variants },
      };
    }).filter(img => img.id && Object.keys(img.attributes.variants).length > 0);

    const profile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...displayNameMaybe,
      bio,
      publicData: {
        ...pickUserFieldsData(rest, 'public', userType, userFields),
        profileGalleryImages,
      },
      protectedData: {
        ...pickUserFieldsData(rest, 'protected', userType, userFields),
      },
      privateData: {
        ...pickUserFieldsData(rest, 'private', userType, userFields),
      },
    };
    const uploadedImage = props.image;

    // Update profileImage only if file system has been accessed
    const updatedValues =
      uploadedImage && uploadedImage.imageId && uploadedImage.file
        ? { ...profile, profileImageId: uploadedImage.imageId }
        : profile;

    onUpdateProfile(updatedValues);
  };

  const user = ensureCurrentUser(currentUser);
  const {
    firstName,
    lastName,
    displayName,
    bio,
    publicData,
    protectedData,
    privateData,
  } = user?.attributes.profile;
  // I.e. the status is active, not pending-approval or banned
  const isUnauthorizedUser = currentUser && !isUserAuthorized(currentUser);

  const { userType } = publicData || {};
  const profileImageId = user.profileImage ? user.profileImage.id : null;
  const profileImage = image || { imageId: profileImageId };
  const userTypeConfig = userTypes.find(config => config.userType === userType);
  const isDisplayNameIncluded = userTypeConfig?.defaultUserFields?.displayName !== false;
  // ProfileSettingsForm decides if it's allowed to show the input field.
  const displayNameMaybe = isDisplayNameIncluded && displayName ? { displayName } : {};

  // Check if gallery has been modified (comparing current gallery with stored)
  const storedIds = new Set(storedGalleryImages.map(img => img.id));
  const currentIds = new Set(galleryImages.map(img => img.id?.uuid || img.id));
  const hasGalleryChanges =
    storedIds.size !== currentIds.size ||
    [...storedIds].some(id => !currentIds.has(id)) ||
    [...currentIds].some(id => !storedIds.has(id));

  const profileSettingsForm = user.id ? (
    <ProfileSettingsForm
      className={css.form}
      currentUser={currentUser}
      initialValues={{
        firstName,
        lastName,
        ...displayNameMaybe,
        bio,
        profileImage: user.profileImage,
        ...initialValuesForUserFields(publicData, 'public', userType, userFields),
        ...initialValuesForUserFields(protectedData, 'protected', userType, userFields),
        ...initialValuesForUserFields(privateData, 'private', userType, userFields),
      }}
      profileImage={profileImage}
      onImageUpload={e => onImageUploadHandler(e, onImageUpload)}
      uploadInProgress={uploadInProgress}
      updateInProgress={updateInProgress}
      uploadImageError={uploadImageError}
      updateProfileError={updateProfileError}
      onSubmit={values => handleSubmit(values, userType)}
      marketplaceName={config.marketplaceName}
      userFields={userFields}
      userTypeConfig={userTypeConfig}
      hasGalleryChanges={hasGalleryChanges}
    >
      <ProfileGalleryEditor
        images={galleryImages}
        onImageUpload={onGalleryImageUpload}
        onRemoveImage={onRemoveGalleryImage}
        uploadInProgress={uploadGalleryInProgress}
        uploadError={uploadGalleryImageError}
      />
    </ProfileSettingsForm>
  ) : null;

  const title = intl.formatMessage({ id: 'ProfileSettingsPage.title' });

  return (
    <Page className={css.root} title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        topbar={
          <>
            <TopbarContainer />
            <UserNav currentPage="ProfileSettingsPage" />
          </>
        }
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          <div className={css.headingContainer}>
            <H3 as="h1" className={css.heading}>
              <FormattedMessage id="ProfileSettingsPage.heading" />
            </H3>

          <ViewProfileLink userUUID={user?.id?.uuid} isUnauthorizedUser={isUnauthorizedUser} />
        </div>
        {profileSettingsForm}
      </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    image,
    galleryImages,
    removedGalleryImageIds,
    uploadImageError,
    uploadGalleryImageError,
    uploadInProgress,
    uploadGalleryInProgress,
    updateInProgress,
    updateProfileError,
  } = state.ProfileSettingsPage;

  // Get stored images from user's publicData
  const storedGalleryImages =
    currentUser?.attributes?.profile?.publicData?.profileGalleryImages || [];

  // Filter out removed images from the display list
  const removedIds = new Set(removedGalleryImageIds);
  const filteredGalleryImages = galleryImages.filter(img => {
    const imgId = img.id?.uuid || img.id;
    return !removedIds.has(imgId);
  });

  return {
    currentUser,
    image,
    galleryImages: filteredGalleryImages,
    storedGalleryImages,
    scrollingDisabled: isScrollingDisabled(state),
    updateInProgress,
    updateProfileError,
    uploadImageError,
    uploadGalleryImageError,
    uploadInProgress,
    uploadGalleryInProgress,
  };
};

const mapDispatchToProps = dispatch => ({
  onImageUpload: data => dispatch(uploadImage(data)),
  onGalleryImageUpload: data => dispatch(uploadGalleryImage(data)),
  onRemoveGalleryImage: id => dispatch(removeGalleryImage(id)),
  onLoadGalleryImages: images => dispatch(loadGalleryImages(images)),
  onUpdateProfile: data => dispatch(updateProfile(data)),
});

const ProfileSettingsPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(ProfileSettingsPageComponent);

export default ProfileSettingsPage;

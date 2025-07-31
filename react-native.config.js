module.exports = {
  dependencies: {
    'react-native-svg': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-svg/android',
          packageImportPath: 'import com.horcrux.svg.SvgPackage;',
        },
      },
    },
    'react-native-reanimated': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-reanimated/android',
          packageImportPath: 'import com.swmansion.reanimated.ReanimatedPackage;',
        },
      },
    },
    'react-native-gesture-handler': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-gesture-handler/android',
          packageImportPath: 'import com.swmansion.gesturehandler.RNGestureHandlerPackage;',
        },
      },
    },
    'react-native-vector-icons': {
      platforms: {
        android: null, // Let autolinking handle this
      },
    },
  },
  assets: ['./node_modules/react-native-vector-icons/Fonts/'],
};

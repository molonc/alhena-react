# Alhena - React

## Install Dependencies
Note: use `node v12`
```
yarn install
```

## Start Development Server
```
yarn start
```
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Docker build and Dockerhub
This project can be built for production and packaged with Docker. Replace the version number with the version of the application being built.

```
docker build . -t alhena-react:v1.0.6

# (Optional) for testing
docker run -d -p 3000:3000 --link graphql:graphql alhena-react:v1.0.6

# Push to Dockerhub

# Log in, if needed
docker login -u molonc 

docker tag alhena-react:v1.0.6 molonc/alhena-react:v1.0.6
docker push molonc/alhena-react:v1.0.6
```
